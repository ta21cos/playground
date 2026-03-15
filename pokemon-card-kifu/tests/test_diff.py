"""Tests for diff computation."""

from __future__ import annotations

from kifu.diff import compute_diff
from kifu.models import ZoneName
from tests.conftest import make_board


class TestComputeDiff:
    def test_no_changes(self) -> None:
        board = make_board(0, {ZoneName.ACTIVE: ["ピカチュウ"]}, {})
        diff = compute_diff(board, board)
        assert diff.changes == []

    def test_card_added_to_bench(self) -> None:
        prev = make_board(0, {ZoneName.BENCH_1: []}, {})
        curr = make_board(1, {ZoneName.BENCH_1: ["ライチュウ"]}, {})
        diff = compute_diff(prev, curr)
        assert len(diff.changes) == 1
        change = diff.changes[0]
        assert change.zone == ZoneName.BENCH_1
        assert change.before == []
        assert change.after == ["ライチュウ"]

    def test_stadium_change(self) -> None:
        prev = make_board(0, {}, {}, stadium=None)
        curr = make_board(1, {}, {}, stadium=["ボウルタウン"])
        diff = compute_diff(prev, curr)
        stadium_changes = [c for c in diff.changes if c.zone == ZoneName.STADIUM]
        assert len(stadium_changes) == 1
        assert stadium_changes[0].after == ["ボウルタウン"]

    def test_active_player_alternates(self) -> None:
        board0 = make_board(0, {}, {})
        board1 = make_board(1, {}, {})
        board2 = make_board(2, {}, {})
        diff1 = compute_diff(board0, board1)
        diff2 = compute_diff(board1, board2)
        assert diff1.active_player != diff2.active_player
