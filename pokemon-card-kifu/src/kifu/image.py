"""画像処理: ゾーン切り出しとpHash計算。"""

from __future__ import annotations

from pathlib import Path

import cv2
import imagehash
import numpy as np
from numpy.typing import NDArray
from PIL import Image

from kifu.models import ZoneConfig, ZoneName, ZoneRect


def load_image(path: Path) -> NDArray[np.uint8]:
    """画像を読み込む。"""
    img = cv2.imread(str(path))
    if img is None:
        msg = f"画像を読み込めません: {path}"
        raise FileNotFoundError(msg)
    return np.asarray(img, dtype=np.uint8)


def crop_zone(image: NDArray[np.uint8], rect: ZoneRect) -> NDArray[np.uint8]:
    """画像からゾーン矩形を切り出す。"""
    cropped = image[rect.y : rect.y + rect.h, rect.x : rect.x + rect.w]
    return np.asarray(cropped, dtype=np.uint8)


def compute_phash(image: NDArray[np.uint8], hash_size: int = 16) -> imagehash.ImageHash:
    """画像のpHashを計算する。"""
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    return imagehash.phash(pil_image, hash_size=hash_size)


def extract_zones(
    image: NDArray[np.uint8],
    zone_config: ZoneConfig,
    player: int,
) -> dict[ZoneName, NDArray[np.uint8]]:
    """画像からプレイヤーの全ゾーンを切り出す。"""
    zones = zone_config.player1 if player == 1 else zone_config.player2
    return {zone: crop_zone(image, rect) for zone, rect in zones.items()}


def detect_changed_zones(
    prev_zones: dict[ZoneName, NDArray[np.uint8]],
    curr_zones: dict[ZoneName, NDArray[np.uint8]],
    threshold: int = 12,
) -> list[ZoneName]:
    """pHashで前ターンと比較して変化したゾーンを検出する。"""
    changed: list[ZoneName] = []
    for zone in curr_zones:
        if zone not in prev_zones:
            changed.append(zone)
            continue
        prev_hash = compute_phash(prev_zones[zone])
        curr_hash = compute_phash(curr_zones[zone])
        if prev_hash - curr_hash > threshold:
            changed.append(zone)
    return changed


def encode_zone_png(image: NDArray[np.uint8]) -> bytes:
    """ゾーン画像をPNGバイト列にエンコードする。"""
    success, buffer = cv2.imencode(".png", image)
    if not success:
        msg = "PNG encoding failed"
        raise RuntimeError(msg)
    return bytes(buffer)
