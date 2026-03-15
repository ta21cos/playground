"""盤面差分検出。"""

from __future__ import annotations

from kifu.models import BoardState, PlayerState, TurnDiff, ZoneChange, ZoneName


def _diff_player(
    prev: PlayerState,
    curr: PlayerState,
    player: int,
) -> list[ZoneChange]:
    changes: list[ZoneChange] = []
    all_zones = set(prev.zones.keys()) | set(curr.zones.keys())

    for zone in sorted(all_zones, key=lambda z: z.value):
        prev_state = prev.zones.get(zone)
        curr_state = curr.zones.get(zone)

        prev_cards = prev_state.cards if prev_state else []
        curr_cards = curr_state.cards if curr_state else []
        prev_count = prev_state.count if prev_state else None
        curr_count = curr_state.count if curr_state else None

        if prev_cards != curr_cards or prev_count != curr_count:
            changes.append(
                ZoneChange(
                    zone=zone,
                    player=player,
                    before=prev_cards,
                    after=curr_cards,
                    count_before=prev_count,
                    count_after=curr_count,
                )
            )
    return changes


def _diff_stadium(prev: BoardState, curr: BoardState) -> list[ZoneChange]:
    prev_cards = prev.stadium.cards if prev.stadium else []
    curr_cards = curr.stadium.cards if curr.stadium else []

    if prev_cards != curr_cards:
        return [
            ZoneChange(
                zone=ZoneName.STADIUM,
                player=curr.turn % 2 + 1,
                before=prev_cards,
                after=curr_cards,
            )
        ]
    return []


def compute_diff(prev: BoardState, curr: BoardState) -> TurnDiff:
    """2つの盤面状態から差分を計算する。"""
    active_player = (curr.turn % 2) + 1

    changes: list[ZoneChange] = []
    changes.extend(_diff_player(prev.player1, curr.player1, player=1))
    changes.extend(_diff_player(prev.player2, curr.player2, player=2))
    changes.extend(_diff_stadium(prev, curr))

    return TurnDiff(
        turn=curr.turn,
        active_player=active_player,
        changes=changes,
    )
