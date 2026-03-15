"""Shared test fixtures."""

from __future__ import annotations

import pytest

from kifu.models import (
    BoardState,
    DeckCard,
    DeckList,
    PlayerState,
    ZoneConfig,
    ZoneName,
    ZoneRect,
    ZoneState,
)


@pytest.fixture
def sample_deck() -> DeckList:
    return DeckList(
        cards=[
            DeckCard(index=0, name="ピカチュウex", count=2),
            DeckCard(index=1, name="ライチュウ", count=2),
            DeckCard(index=2, name="ピカチュウ", count=4),
        ]
    )


@pytest.fixture
def sample_zone_config() -> ZoneConfig:
    rect = ZoneRect(x=0, y=0, w=100, h=100)
    zones = {zone: rect for zone in ZoneName}
    return ZoneConfig(player1=zones, player2=zones)


def make_player_state(zone_cards: dict[ZoneName, list[str]]) -> PlayerState:
    zones: dict[ZoneName, ZoneState] = {}
    for zone, cards in zone_cards.items():
        if zone in (ZoneName.SIDE, ZoneName.DECK):
            zones[zone] = ZoneState(zone=zone, count=len(cards))
        else:
            zones[zone] = ZoneState(zone=zone, cards=cards)
    return PlayerState(zones=zones)


def make_board(
    turn: int,
    p1_zones: dict[ZoneName, list[str]],
    p2_zones: dict[ZoneName, list[str]],
    stadium: list[str] | None = None,
) -> BoardState:
    return BoardState(
        turn=turn,
        player1=make_player_state(p1_zones),
        player2=make_player_state(p2_zones),
        stadium=ZoneState(zone=ZoneName.STADIUM, cards=stadium) if stadium else None,
    )
