"""差分から棋譜テキストを生成する。"""

from __future__ import annotations

from kifu.models import (
    ZONE_LABEL,
    KifuEntry,
    KifuOutput,
    TurnDiff,
    ZoneChange,
    ZoneName,
)


def _describe_change(change: ZoneChange) -> str:
    label = ZONE_LABEL.get(change.zone, change.zone.value)
    prefix = f"P{change.player} {label}"

    if change.zone in (ZoneName.SIDE, ZoneName.DECK):
        before = change.count_before if change.count_before is not None else "?"
        after = change.count_after if change.count_after is not None else "?"
        return f"{prefix}: {before}枚 → {after}枚"

    if change.zone == ZoneName.STADIUM:
        before_str = change.before[0] if change.before else "-"
        after_str = change.after[0] if change.after else "-"
        return f"スタジアム: {before_str} → {after_str}"

    before_str = ", ".join(change.before) if change.before else "-"
    after_str = ", ".join(change.after) if change.after else "-"
    return f"{prefix}: {before_str} → {after_str}"


def generate_kifu(diffs: list[TurnDiff]) -> KifuOutput:
    """差分リストから棋譜を生成する。"""
    entries: list[KifuEntry] = []

    for diff in diffs:
        for change in diff.changes:
            description = _describe_change(change)
            entries.append(
                KifuEntry(
                    turn=diff.turn,
                    player=diff.active_player,
                    description=description,
                )
            )

    return KifuOutput(entries=entries)
