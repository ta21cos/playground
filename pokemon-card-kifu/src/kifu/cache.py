"""pHash → 識別結果キャッシュ。"""

from __future__ import annotations

import imagehash

from kifu.models import CardIdentification


class IdentificationCache:
    """pHashをキーにしたカード識別結果キャッシュ。"""

    def __init__(self, tolerance: int = 8) -> None:
        self._cache: dict[str, CardIdentification] = {}
        self._hashes: list[tuple[imagehash.ImageHash, str]] = []
        self._tolerance = tolerance

    def get(self, phash: imagehash.ImageHash) -> CardIdentification | None:
        """キャッシュから近似マッチを検索する。"""
        phash_str = str(phash)
        if phash_str in self._cache:
            return self._cache[phash_str]
        for stored_hash, key in self._hashes:
            if stored_hash - phash <= self._tolerance:
                return self._cache[key]
        return None

    def put(self, phash: imagehash.ImageHash, result: CardIdentification) -> None:
        """識別結果をキャッシュに保存する。"""
        key = str(phash)
        self._cache[key] = result
        self._hashes.append((phash, key))

    def __len__(self) -> int:
        return len(self._cache)
