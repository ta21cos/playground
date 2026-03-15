"""Tests for models."""

from __future__ import annotations

from kifu.models import (
    CardIdentification,
    DeckCard,
    DeckList,
    KifuEntry,
    KifuOutput,
    ZoneName,
    ZoneRect,
    ZoneState,
)


class TestZoneRect:
    def test_creation(self) -> None:
        rect = ZoneRect(x=10, y=20, w=100, h=200)
        assert rect.x == 10
        assert rect.h == 200


class TestDeckList:
    def test_creation(self) -> None:
        deck = DeckList(
            cards=[DeckCard(index=0, name="ピカチュウ", count=4)]
        )
        assert len(deck.cards) == 1
        assert deck.cards[0].name == "ピカチュウ"


class TestCardIdentification:
    def test_creation(self) -> None:
        card = CardIdentification(index=0, name="ピカチュウ", confidence=0.95)
        assert card.confidence == 0.95

    def test_confidence_bounds(self) -> None:
        import pytest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CardIdentification(index=0, name="test", confidence=1.5)


class TestZoneState:
    def test_with_cards(self) -> None:
        state = ZoneState(zone=ZoneName.ACTIVE, cards=["ピカチュウ"])
        assert state.cards == ["ピカチュウ"]

    def test_with_count(self) -> None:
        state = ZoneState(zone=ZoneName.SIDE, count=6)
        assert state.count == 6


class TestKifuOutput:
    def test_to_text(self) -> None:
        output = KifuOutput(
            entries=[
                KifuEntry(turn=1, player=1, description="P1 バトル場: - → ピカチュウ"),
                KifuEntry(turn=1, player=1, description="P1 ベンチ1: - → ライチュウ"),
            ]
        )
        text = output.to_text()
        assert "■ ターン1（P1）" in text
        assert "P1 バトル場: - → ピカチュウ" in text
        assert "P1 ベンチ1: - → ライチュウ" in text

    def test_to_text_multi_turn(self) -> None:
        output = KifuOutput(
            entries=[
                KifuEntry(turn=1, player=1, description="line1"),
                KifuEntry(turn=2, player=2, description="line2"),
            ]
        )
        text = output.to_text()
        assert "■ ターン1（P1）" in text
        assert "■ ターン2（P2）" in text
