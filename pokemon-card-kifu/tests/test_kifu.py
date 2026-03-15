"""Tests for kifu generation."""

from __future__ import annotations

from kifu.kifu import generate_kifu
from kifu.models import TurnDiff, ZoneChange, ZoneName


class TestGenerateKifu:
    def test_empty_diffs(self) -> None:
        kifu = generate_kifu([])
        assert kifu.entries == []
        assert kifu.to_text() == ""

    def test_single_change(self) -> None:
        diff = TurnDiff(
            turn=1,
            active_player=1,
            changes=[
                ZoneChange(
                    zone=ZoneName.ACTIVE,
                    player=1,
                    before=[],
                    after=["ピカチュウex"],
                )
            ],
        )
        kifu = generate_kifu([diff])
        assert len(kifu.entries) == 1
        text = kifu.to_text()
        assert "ピカチュウex" in text

    def test_stadium_format(self) -> None:
        diff = TurnDiff(
            turn=1,
            active_player=1,
            changes=[
                ZoneChange(
                    zone=ZoneName.STADIUM,
                    player=1,
                    before=[],
                    after=["ボウルタウン"],
                )
            ],
        )
        kifu = generate_kifu([diff])
        text = kifu.to_text()
        assert "スタジアム: - → ボウルタウン" in text

    def test_side_count_format(self) -> None:
        diff = TurnDiff(
            turn=1,
            active_player=1,
            changes=[
                ZoneChange(
                    zone=ZoneName.SIDE,
                    player=1,
                    before=[],
                    after=[],
                    count_before=6,
                    count_after=5,
                )
            ],
        )
        kifu = generate_kifu([diff])
        text = kifu.to_text()
        assert "6枚 → 5枚" in text
