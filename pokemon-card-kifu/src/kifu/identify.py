"""Gemini API によるカード識別。"""

from __future__ import annotations

import base64
import os
from typing import Any

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from kifu.models import CardIdentification, DeckList, ZoneName

SYSTEM_INSTRUCTION = """\
あなたはポケモンカードの識別エキスパートです。
提示される画像はポケモンカードゲームの盤面から切り出したゾーンの画像です。
デッキリストを参照し、画像内のカードをインデックス番号で識別してください。
"""


class ZoneIdentificationRequest(BaseModel):
    """1ゾーンの識別リクエスト。"""

    zone: ZoneName
    player: int = Field(ge=1, le=2)
    image_png: bytes


class IdentificationResult(BaseModel):
    """バッチ識別の結果。"""

    zone: ZoneName
    player: int
    cards: list[CardIdentification]


def _build_deck_prompt(deck: DeckList) -> str:
    lines = ["デッキリスト:"]
    for card in deck.cards:
        lines.append(f"  [{card.index}] {card.name} x{card.count}")
    return "\n".join(lines)


def _build_zone_parts(
    requests: list[ZoneIdentificationRequest],
) -> list[types.Part]:
    parts: list[types.Part] = []
    for req in requests:
        parts.append(
            types.Part(text=f"--- P{req.player} {req.zone.value} ---")
        )
        parts.append(
            types.Part(
                inline_data=types.Blob(
                    mime_type="image/png",
                    data=base64.standard_b64encode(req.image_png),
                )
            )
        )
    return parts


RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "zone": {"type": "string"},
            "player": {"type": "integer"},
            "cards": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": {"type": "integer"},
                        "name": {"type": "string"},
                        "confidence": {"type": "number"},
                    },
                    "required": ["index", "name", "confidence"],
                },
            },
        },
        "required": ["zone", "player", "cards"],
    },
}


async def identify_zones_batch(
    requests: list[ZoneIdentificationRequest],
    deck1: DeckList,
    deck2: DeckList,
) -> list[IdentificationResult]:
    """複数ゾーンをバッチで識別する。"""
    if not requests:
        return []

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        msg = "GEMINI_API_KEY environment variable is not set"
        raise RuntimeError(msg)

    client = genai.Client(api_key=api_key)

    prompt_parts: list[types.Part] = [
        types.Part(text=_build_deck_prompt(deck1)),
        types.Part(text=_build_deck_prompt(deck2)),
        types.Part(
            text="以下の各ゾーン画像について、カードを識別してJSON配列で返してください。"
        ),
        *_build_zone_parts(requests),
    ]

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[types.Content(parts=prompt_parts, role="user")],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )

    raw_results: list[dict[str, Any]] = response.parsed  # type: ignore[assignment]
    results: list[IdentificationResult] = []
    for raw in raw_results:
        cards = [CardIdentification.model_validate(c) for c in raw["cards"]]
        results.append(
            IdentificationResult(
                zone=ZoneName(raw["zone"]),
                player=raw["player"],
                cards=cards,
            )
        )
    return results
