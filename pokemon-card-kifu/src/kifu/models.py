"""Pydantic models for pokemon card kifu."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class ZoneName(StrEnum):
    ACTIVE = "active"
    BENCH_1 = "bench_1"
    BENCH_2 = "bench_2"
    BENCH_3 = "bench_3"
    BENCH_4 = "bench_4"
    BENCH_5 = "bench_5"
    SIDE = "side"
    DECK = "deck"
    DISCARD = "discard"
    STADIUM = "stadium"


ZONE_LABEL: dict[ZoneName, str] = {
    ZoneName.ACTIVE: "バトル場",
    ZoneName.BENCH_1: "ベンチ1",
    ZoneName.BENCH_2: "ベンチ2",
    ZoneName.BENCH_3: "ベンチ3",
    ZoneName.BENCH_4: "ベンチ4",
    ZoneName.BENCH_5: "ベンチ5",
    ZoneName.SIDE: "サイド",
    ZoneName.DECK: "山札",
    ZoneName.DISCARD: "トラッシュ",
    ZoneName.STADIUM: "スタジアム",
}


class ZoneRect(BaseModel):
    """画像上のゾーン矩形座標。"""

    x: int
    y: int
    w: int
    h: int


class ZoneConfig(BaseModel):
    """ゾーン設定: プレイヤーごとの矩形定義。"""

    player1: dict[ZoneName, ZoneRect]
    player2: dict[ZoneName, ZoneRect]


class DeckCard(BaseModel):
    """デッキリスト内の1枚。"""

    index: int
    name: str
    count: int


class DeckList(BaseModel):
    """プレイヤーのデッキリスト。"""

    cards: list[DeckCard]


class CardIdentification(BaseModel):
    """Gemini APIから返されるカード識別結果。"""

    index: int = Field(description="デッキリスト内のインデックス")
    name: str = Field(description="カード名")
    confidence: float = Field(ge=0.0, le=1.0, description="識別信頼度")


class ZoneState(BaseModel):
    """1ゾーンの状態。"""

    zone: ZoneName
    cards: list[str] = Field(default_factory=list, description="ゾーン内のカード名リスト")
    count: int | None = Field(default=None, description="枚数（サイド・山札用）")


class PlayerState(BaseModel):
    """1プレイヤーの盤面状態。"""

    zones: dict[ZoneName, ZoneState]


class BoardState(BaseModel):
    """1ターンの盤面全体。"""

    turn: int
    player1: PlayerState
    player2: PlayerState
    stadium: ZoneState | None = None


class ZoneChange(BaseModel):
    """1ゾーンの変化。"""

    zone: ZoneName
    player: int = Field(ge=1, le=2)
    before: list[str]
    after: list[str]
    count_before: int | None = None
    count_after: int | None = None


class TurnDiff(BaseModel):
    """ターン間の変化。"""

    turn: int
    active_player: int = Field(ge=1, le=2, description="このターンの手番プレイヤー")
    changes: list[ZoneChange]


class KifuEntry(BaseModel):
    """棋譜1行。"""

    turn: int
    player: int
    description: str


class KifuOutput(BaseModel):
    """棋譜全体。"""

    entries: list[KifuEntry]

    def to_text(self) -> str:
        lines: list[str] = []
        current_turn = -1
        for entry in self.entries:
            if entry.turn != current_turn:
                current_turn = entry.turn
                lines.append(f"\n■ ターン{current_turn}（P{entry.player}）")
            lines.append(f"  {entry.description}")
        return "\n".join(lines).strip()
