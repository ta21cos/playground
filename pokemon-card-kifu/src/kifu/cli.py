"""CLI定義。"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from kifu.cache import IdentificationCache
from kifu.config import load_deck_list, load_env, load_zone_config
from kifu.diff import compute_diff
from kifu.identify import (
    IdentificationResult,
    ZoneIdentificationRequest,
    identify_zones_batch,
)
from kifu.image import (
    compute_phash,
    detect_changed_zones,
    encode_zone_png,
    extract_zones,
    load_image,
)
from kifu.kifu import generate_kifu
from kifu.models import (
    BoardState,
    DeckList,
    PlayerState,
    TurnDiff,
    ZoneConfig,
    ZoneName,
    ZoneState,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="kifu",
        description="ポケモンカード対戦棋譜自動生成ツール",
    )
    parser.add_argument("images", nargs="+", type=Path, help="ターン画像ファイル群")
    parser.add_argument("--deck1", type=Path, required=True, help="P1デッキリストJSON")
    parser.add_argument("--deck2", type=Path, required=True, help="P2デッキリストJSON")
    parser.add_argument("--zones", type=Path, required=True, help="ゾーン設定JSON")
    parser.add_argument("-o", "--output", type=Path, default=None, help="出力ファイル")
    return parser


def _build_zone_state(
    zone: ZoneName,
    cards: list[str],
) -> ZoneState:
    if zone in (ZoneName.SIDE, ZoneName.DECK):
        return ZoneState(zone=zone, count=len(cards))
    return ZoneState(zone=zone, cards=cards)


def _identification_to_zone_states(
    results: list[IdentificationResult],
    prev_state: PlayerState,
) -> dict[ZoneName, ZoneState]:
    zones = dict(prev_state.zones)
    for result in results:
        cards = [c.name for c in result.cards]
        zones[result.zone] = _build_zone_state(result.zone, cards)
    return zones


async def _process_turn(
    turn_idx: int,
    image: NDArray[np.uint8],
    prev_zones_p1: dict[ZoneName, NDArray[np.uint8]],
    prev_zones_p2: dict[ZoneName, NDArray[np.uint8]],
    zone_config: ZoneConfig,
    deck1: DeckList,
    deck2: DeckList,
    cache: IdentificationCache,
    prev_board: BoardState,
) -> tuple[
    BoardState,
    TurnDiff,
    dict[ZoneName, NDArray[np.uint8]],
    dict[ZoneName, NDArray[np.uint8]],
]:
    curr_zones_p1 = extract_zones(image, zone_config, player=1)
    curr_zones_p2 = extract_zones(image, zone_config, player=2)

    changed_p1 = detect_changed_zones(prev_zones_p1, curr_zones_p1)
    changed_p2 = detect_changed_zones(prev_zones_p2, curr_zones_p2)

    requests: list[ZoneIdentificationRequest] = []
    cached_results: list[IdentificationResult] = []

    for zone in changed_p1:
        zone_img = curr_zones_p1[zone]
        phash = compute_phash(zone_img)
        cached = cache.get(phash)
        if cached:
            cached_results.append(
                IdentificationResult(zone=zone, player=1, cards=[cached])
            )
        else:
            requests.append(
                ZoneIdentificationRequest(
                    zone=zone, player=1, image_png=encode_zone_png(zone_img)
                )
            )

    for zone in changed_p2:
        zone_img = curr_zones_p2[zone]
        phash = compute_phash(zone_img)
        cached = cache.get(phash)
        if cached:
            cached_results.append(
                IdentificationResult(zone=zone, player=2, cards=[cached])
            )
        else:
            requests.append(
                ZoneIdentificationRequest(
                    zone=zone, player=2, image_png=encode_zone_png(zone_img)
                )
            )

    api_results = await identify_zones_batch(requests, deck1, deck2) if requests else []

    for req, result in zip(requests, api_results, strict=False):
        zone_img = (
            curr_zones_p1[req.zone] if req.player == 1 else curr_zones_p2[req.zone]
        )
        phash = compute_phash(zone_img)
        for card in result.cards:
            cache.put(phash, card)

    all_results = cached_results + api_results
    p1_results = [r for r in all_results if r.player == 1]
    p2_results = [r for r in all_results if r.player == 2]

    p1_zones = _identification_to_zone_states(p1_results, prev_board.player1)
    p2_zones = _identification_to_zone_states(p2_results, prev_board.player2)

    stadium = prev_board.stadium
    for result in all_results:
        if result.zone == ZoneName.STADIUM and result.cards:
            stadium = ZoneState(
                zone=ZoneName.STADIUM,
                cards=[c.name for c in result.cards],
            )

    curr_board = BoardState(
        turn=turn_idx,
        player1=PlayerState(zones=p1_zones),
        player2=PlayerState(zones=p2_zones),
        stadium=stadium,
    )

    diff = compute_diff(prev_board, curr_board)
    return curr_board, diff, curr_zones_p1, curr_zones_p2


def _empty_player_state(zone_config: ZoneConfig, player: int) -> PlayerState:
    zones_cfg = zone_config.player1 if player == 1 else zone_config.player2
    zones: dict[ZoneName, ZoneState] = {}
    for zone in zones_cfg:
        zones[zone] = ZoneState(zone=zone)
    return PlayerState(zones=zones)


async def _run(args: argparse.Namespace) -> None:
    zone_config = load_zone_config(args.zones)
    deck1 = load_deck_list(args.deck1)
    deck2 = load_deck_list(args.deck2)
    image_paths: list[Path] = args.images

    cache = IdentificationCache()
    diffs: list[TurnDiff] = []

    prev_board = BoardState(
        turn=0,
        player1=_empty_player_state(zone_config, 1),
        player2=_empty_player_state(zone_config, 2),
    )

    first_image = load_image(image_paths[0])
    prev_zones_p1 = extract_zones(first_image, zone_config, player=1)
    prev_zones_p2 = extract_zones(first_image, zone_config, player=2)

    for i, img_path in enumerate(image_paths):
        turn_idx = i
        image = load_image(img_path)
        prev_board, diff, prev_zones_p1, prev_zones_p2 = await _process_turn(
            turn_idx=turn_idx,
            image=image,
            prev_zones_p1=prev_zones_p1,
            prev_zones_p2=prev_zones_p2,
            zone_config=zone_config,
            deck1=deck1,
            deck2=deck2,
            cache=cache,
            prev_board=prev_board,
        )
        diffs.append(diff)

    kifu = generate_kifu(diffs)
    text = kifu.to_text()

    output_path: Path | None = args.output
    if output_path:
        output_path.write_text(text, encoding="utf-8")
        print(f"棋譜を {output_path} に出力しました")
    else:
        print(text)


def main() -> None:
    load_env()
    parser = _build_parser()
    args = parser.parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
