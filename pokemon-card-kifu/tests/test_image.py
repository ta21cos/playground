"""Tests for image processing."""

from __future__ import annotations

import numpy as np

from kifu.image import compute_phash, crop_zone, detect_changed_zones, encode_zone_png
from kifu.models import ZoneName, ZoneRect


def _make_test_image(w: int = 200, h: int = 200, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 256, size=(h, w, 3), dtype=np.uint8)


class TestCropZone:
    def test_crop(self) -> None:
        image = _make_test_image(400, 400, seed=0)
        rect = ZoneRect(x=10, y=20, w=100, h=50)
        cropped = crop_zone(image, rect)
        assert cropped.shape == (50, 100, 3)


class TestComputePhash:
    def test_same_image_same_hash(self) -> None:
        img = _make_test_image(seed=42)
        h1 = compute_phash(img)
        h2 = compute_phash(img)
        assert h1 == h2

    def test_different_image_different_hash(self) -> None:
        img1 = _make_test_image(seed=1)
        img2 = _make_test_image(seed=2)
        h1 = compute_phash(img1)
        h2 = compute_phash(img2)
        assert h1 - h2 > 0


class TestDetectChangedZones:
    def test_no_change(self) -> None:
        img = _make_test_image(seed=42)
        zones = {ZoneName.ACTIVE: img, ZoneName.BENCH_1: img}
        changed = detect_changed_zones(zones, zones)
        assert changed == []

    def test_with_change(self) -> None:
        img1 = _make_test_image(seed=1)
        img2 = _make_test_image(seed=2)
        prev = {ZoneName.ACTIVE: img1}
        curr = {ZoneName.ACTIVE: img2}
        changed = detect_changed_zones(prev, curr)
        assert ZoneName.ACTIVE in changed


class TestEncode:
    def test_encode_png(self) -> None:
        img = _make_test_image(seed=0)
        data = encode_zone_png(img)
        assert data[:4] == b"\x89PNG"
