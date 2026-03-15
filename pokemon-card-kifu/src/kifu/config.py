"""設定ファイル読み込み。"""

from __future__ import annotations

import json
import os
from pathlib import Path

from kifu.models import DeckList, ZoneConfig


def load_env(path: Path | None = None) -> None:
    """プロジェクトルートの .env を os.environ に読み込む。"""
    if path is None:
        path = Path(__file__).resolve().parents[2] / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition("=")
        if key and _ == "=":
            os.environ.setdefault(key.strip(), value.strip())


def load_zone_config(path: Path) -> ZoneConfig:
    """ゾーン設定JSONを読み込む。"""
    with path.open() as f:
        data = json.load(f)
    return ZoneConfig.model_validate(data)


def load_deck_list(path: Path) -> DeckList:
    """デッキリストJSONを読み込む。"""
    with path.open() as f:
        data = json.load(f)
    return DeckList.model_validate(data)
