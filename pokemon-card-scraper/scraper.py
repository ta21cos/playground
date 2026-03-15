#!/usr/bin/env python3
"""Pokemon Card Scraper — fetches card data from pokemon-card.com and stores in SQLite."""

import argparse
import hashlib
import json
import random
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.pokemon-card.com/card-search/details.php/card/{card_id}/"
SEARCH_API_URL = "https://www.pokemon-card.com/card-search/resultAPI.php"

ICON_TO_TYPE = {
    "icon-grass": "草",
    "icon-fire": "炎",
    "icon-water": "水",
    "icon-electric": "雷",
    "icon-lightning": "雷",
    "icon-psychic": "超",
    "icon-fighting": "闘",
    "icon-dark": "悪",
    "icon-darkness": "悪",
    "icon-steel": "鋼",
    "icon-metal": "鋼",
    "icon-dragon": "竜",
    "icon-fairy": "フェアリー",
    "icon-none": "無",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


# ---------------------------------------------------------------------------
# SQLite
# ---------------------------------------------------------------------------

def init_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            card_id     TEXT PRIMARY KEY,
            name        TEXT,
            card_category TEXT,
            data        TEXT NOT NULL,
            image_path  TEXT,
            fetched_at  TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def get_fetched_ids(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT card_id FROM cards").fetchall()
    return {r[0] for r in rows}


def save_card(conn: sqlite3.Connection, data: dict, image_path: str | None = None):
    conn.execute(
        """
        INSERT OR REPLACE INTO cards (card_id, name, card_category, data, image_path, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data["card_id"],
            data.get("name", ""),
            data.get("card_category", ""),
            json.dumps(data, ensure_ascii=False),
            image_path or "",
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Card ID input
# ---------------------------------------------------------------------------

def fetch_pack_card_ids(session: requests.Session, pack_id: str) -> list[str]:
    """Fetch all card IDs belonging to a pack via the search API."""
    ids = []
    page = 1
    while True:
        params = {
            "keyword": "",
            "se_ta": "",
            "regulation_sidebar_form": "all",
            "pg": pack_id,
            "illust": "",
            "sm_and_keyword": "true",
            "page": str(page),
        }
        resp = session.get(SEARCH_API_URL, params=params, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        for card in data.get("cardList", []):
            card_id = str(card.get("cardID", ""))
            if card_id:
                ids.append(card_id)
        max_page = data.get("maxPage", 1)
        print(f"  Pack {pack_id}: page {page}/{max_page}, got {len(data.get('cardList', []))} cards")
        if page >= max_page:
            break
        page += 1
        time.sleep(random.uniform(1.0, 3.0))
    return ids


def read_card_ids(filepath: str) -> list[str]:
    path = Path(filepath)
    ids = []
    for line in path.read_text().strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        card_id = line.split(",")[0].strip()
        if card_id:
            ids.append(card_id)
    return ids


# ---------------------------------------------------------------------------
# HTML parsing
# ---------------------------------------------------------------------------

def extract_icon_types(element) -> list[str]:
    types = []
    if element is None:
        return types
    for icon in element.select("span.icon"):
        for cls in icon.get("class", []):
            if cls in ICON_TO_TYPE:
                types.append(ICON_TO_TYPE[cls])
    return types


def parse_card(html: str, card_id: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    section = soup.select_one("section.Section")
    if not section:
        return {}

    result = {"card_id": card_id}

    h1 = section.select_one("h1.Heading1")
    result["name"] = h1.get_text(strip=True) if h1 else ""

    img = section.select_one(".LeftBox img.fit")
    if img and img.get("src"):
        result["image_url"] = "https://www.pokemon-card.com" + img["src"]
    else:
        result["image_url"] = ""

    reg_img = section.select_one(".subtext .img-regulation")
    result["regulation"] = reg_img.get("alt", "") if reg_img else ""

    subtext = section.select_one(".subtext")
    if subtext:
        raw = subtext.get_text()
        raw = re.sub(r"\s+", " ", raw).strip()
        raw = re.sub(r"^[A-Z][A-Z0-9]*\s*", "", raw).strip()
        num_match = re.search(r"(\d+\s*/\s*\d+)", raw)
        result["card_number"] = num_match.group(1).replace(" ", "") if num_match else raw

        rarity_img = subtext.select_one("img:not(.img-regulation)")
        if rarity_img and rarity_img.get("src"):
            rarity_src = rarity_img["src"]
            match = re.search(r"ic_rare_(.+?)\.gif", rarity_src)
            result["rarity"] = match.group(1) if match else ""
        else:
            result["rarity"] = ""
    else:
        result["card_number"] = ""
        result["rarity"] = ""

    author_a = section.select_one(".author a")
    result["illustrator"] = author_a.get_text(strip=True) if author_a else ""

    card_div = section.select_one(".card")
    if card_div:
        card_h4 = card_div.select_one("h4")
        result["pokedex_info"] = card_h4.get_text(strip=True) if card_h4 else ""
        flavor_ps = card_div.select("p")
        if len(flavor_ps) >= 2:
            result["flavor_text"] = flavor_ps[-1].get_text(strip=True)
        else:
            result["flavor_text"] = ""
    else:
        result["pokedex_info"] = ""
        result["flavor_text"] = ""

    right = section.select_one(".RightBox-inner")
    if not right:
        result.update({
            "card_category": "unknown",
            "stage": "",
            "hp": None,
            "type": [],
            "abilities": [],
            "moves": [],
            "weakness": "",
            "resistance": "",
            "retreat_cost": 0,
            "evolutions": [],
            "effect_text": "",
            "rule_text": "",
            "special_rule": "",
        })
        _add_pack_info(soup, section, result)
        return result

    stage_el = right.select_one(".TopInfo .td-l .type")
    result["stage"] = stage_el.get_text(strip=True) if stage_el else ""

    hp_el = right.select_one(".hp-num")
    result["hp"] = int(hp_el.get_text(strip=True)) if hp_el else None

    result["type"] = extract_icon_types(right.select_one(".TopInfo .td-r"))

    h2_tags = right.select("h2")
    h2_texts = [h2.get_text(strip=True) for h2 in h2_tags]

    is_pokemon = "ワザ" in h2_texts or result["hp"] is not None
    non_pokemon_categories = [
        "グッズ", "サポート", "スタジアム", "ポケモンのどうぐ",
        "基本エネルギー", "特殊エネルギー",
    ]
    detected_category = ""
    for cat in non_pokemon_categories:
        if cat in h2_texts:
            detected_category = cat
            break

    if detected_category and not is_pokemon:
        result["card_category"] = detected_category
        _parse_non_pokemon(right, h2_tags, detected_category, result)
    else:
        result["card_category"] = "ポケモン"
        result["effect_text"] = ""
        result["rule_text"] = ""
        _parse_pokemon_details(right, result)

    _add_pack_info(soup, section, result)
    result["canonical_id"] = compute_canonical_id(result)
    return result


def _parse_non_pokemon(right, h2_tags, category: str, result: dict):
    """Parse trainer cards and energy cards."""
    category_h2 = None
    special_rule_h2 = None
    for h2 in h2_tags:
        text = h2.get_text(strip=True)
        if text == category:
            category_h2 = h2
        elif text == "特別なルール":
            special_rule_h2 = h2

    effect_parts = []
    rule_parts = []
    if category_h2:
        sibling = category_h2.find_next_sibling()
        while sibling and sibling.name != "h2":
            if sibling.name == "p":
                text = sibling.get_text(strip=True)
                if text:
                    if _is_rule_text(text, category):
                        rule_parts.append(text)
                    else:
                        effect_parts.append(text)
            sibling = sibling.find_next_sibling()

    result["effect_text"] = "\n".join(effect_parts)
    result["rule_text"] = "\n".join(rule_parts)

    if special_rule_h2:
        parts = []
        sibling = special_rule_h2.find_next_sibling()
        while sibling and sibling.name != "h2":
            if sibling.name == "p":
                text = sibling.get_text(strip=True)
                if text:
                    parts.append(text)
            sibling = sibling.find_next_sibling()
        result["special_rule"] = "\n".join(parts)
    else:
        result["special_rule"] = ""

    result["stage"] = ""
    result["abilities"] = []
    result["moves"] = []
    result["weakness"] = ""
    result["resistance"] = ""
    result["retreat_cost"] = 0
    result["evolutions"] = []


_RULE_PATTERNS = [
    "グッズは、自分の番に何枚でも使える。",
    "サポートは、自分の番に1枚しか使えない。",
    "スタジアムは、",
    "ポケモンのどうぐは、",
]


def _is_rule_text(text: str, category: str) -> bool:
    return any(text.startswith(pat) for pat in _RULE_PATTERNS)


def _parse_pokemon_details(right, result: dict):
    abilities = []
    moves = []
    special_rule_parts = []

    h2_tags = right.select("h2")
    for h2 in h2_tags:
        section_name = h2.get_text(strip=True)

        if section_name == "特性":
            sibling = h2.find_next_sibling()
            while sibling and sibling.name != "h2":
                if sibling.name == "h4":
                    ability = {"name": sibling.get_text(strip=True), "description": ""}
                    desc_el = sibling.find_next_sibling("p")
                    if desc_el and (not desc_el.find_previous_sibling("h2") or desc_el.find_previous_sibling("h2") == h2):
                        ability["description"] = desc_el.get_text(strip=True)
                    abilities.append(ability)
                sibling = sibling.find_next_sibling()

        elif section_name == "ワザ":
            sibling = h2.find_next_sibling()
            while sibling and sibling.name != "h2" and sibling.name != "table":
                if sibling.name == "h4":
                    move = _parse_move(sibling)
                    desc_el = sibling.find_next_sibling("p")
                    if desc_el and (desc_el.find_previous_sibling("h4") == sibling):
                        move["description"] = desc_el.get_text(strip=True)
                    moves.append(move)
                sibling = sibling.find_next_sibling()

        elif section_name == "特別なルール":
            sibling = h2.find_next_sibling()
            while sibling and sibling.name != "h2":
                if sibling.name == "p":
                    text = sibling.get_text(strip=True)
                    if text:
                        special_rule_parts.append(text)
                sibling = sibling.find_next_sibling()

    result["abilities"] = abilities
    result["moves"] = moves
    result["special_rule"] = "\n".join(special_rule_parts)

    table = right.select_one("table")
    if table:
        rows = table.select("tr")
        if len(rows) >= 2:
            cells = rows[1].select("td")
            result["weakness"] = cells[0].get_text(strip=True) if len(cells) > 0 else ""
            weakness_types = extract_icon_types(cells[0]) if len(cells) > 0 else []
            if weakness_types:
                result["weakness"] = weakness_types[0] + result["weakness"]

            result["resistance"] = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            resistance_types = extract_icon_types(cells[1]) if len(cells) > 1 else []
            if resistance_types:
                result["resistance"] = resistance_types[0] + result["resistance"]

            if len(cells) > 2:
                retreat_icons = cells[2].select("span.icon")
                result["retreat_cost"] = len(retreat_icons)
            else:
                result["retreat_cost"] = 0
    else:
        result["weakness"] = ""
        result["resistance"] = ""
        result["retreat_cost"] = 0

    evolutions = []
    for ev in right.select(".evolution"):
        a = ev.select_one("a")
        if a:
            is_current = "ev_on" in ev.get("class", [])
            evolutions.append({
                "name": a.get_text(strip=True),
                "is_current": is_current,
            })
    result["evolutions"] = evolutions


def _parse_move(h4_tag) -> dict:
    energy_cost = extract_icon_types(h4_tag)
    damage_el = h4_tag.select_one(".f_right")
    damage = damage_el.get_text(strip=True) if damage_el else ""

    name_text = h4_tag.get_text(strip=True)
    if damage:
        name_text = name_text.replace(damage, "").strip()
    for t in ICON_TO_TYPE.values():
        name_text = name_text.replace(t, "")

    return {
        "name": name_text.strip(),
        "energy_cost": energy_cost,
        "damage": damage,
        "description": "",
    }


def _add_pack_info(soup, section, result: dict):
    packs = []
    pack_links = section.select(".SubSection .List_item a")
    if not pack_links:
        pack_links = soup.select("ul.List .List_item a")
    for a in pack_links:
        href = a.get("href", "")
        if href and not href.startswith("http"):
            href = "https://www.pokemon-card.com" + href
        name = a.get_text(strip=True)
        if name:
            packs.append({"name": name, "url": href})
    result["packs"] = packs


def compute_canonical_id(data: dict) -> str:
    """Compute a stable ID from gameplay-relevant fields.

    Cards with the same canonical_id are functionally identical
    (different art, rarity, or pack do not affect gameplay).
    """
    key_parts = [
        data.get("name", ""),
        data.get("card_category", ""),
        data.get("stage", ""),
        str(data.get("hp") or ""),
        json.dumps(data.get("type", []), ensure_ascii=False, sort_keys=True),
        json.dumps(data.get("abilities", []), ensure_ascii=False, sort_keys=True),
        json.dumps(data.get("moves", []), ensure_ascii=False, sort_keys=True),
        data.get("weakness", ""),
        data.get("resistance", ""),
        str(data.get("retreat_cost", 0)),
        data.get("effect_text", ""),
        data.get("special_rule", ""),
    ]
    raw = "|".join(key_parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------

def download_image(session: requests.Session, image_url: str, dest: Path, max_retries: int = 3) -> bool:
    if dest.exists():
        return True
    for attempt in range(max_retries):
        try:
            resp = session.get(image_url, headers=HEADERS, timeout=30)
            if resp.status_code == 404:
                print(f"  [SKIP] image 404: {image_url}")
                return False
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = (2 ** attempt) * 5 + random.uniform(0, 3)
                print(f"  [RETRY] image HTTP {resp.status_code}, waiting {wait:.1f}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(resp.content)
            return True
        except requests.RequestException as e:
            wait = (2 ** attempt) * 5 + random.uniform(0, 3)
            print(f"  [RETRY] image {e}, waiting {wait:.1f}s...")
            time.sleep(wait)
    print(f"  [FAIL] image download failed: {image_url}")
    return False


def fetch_card(session: requests.Session, card_id: str, max_retries: int = 3) -> dict | None:
    url = BASE_URL.format(card_id=card_id)
    for attempt in range(max_retries):
        try:
            resp = session.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 404:
                print(f"  [SKIP] {card_id}: 404 Not Found")
                return None
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = (2 ** attempt) * 5 + random.uniform(0, 3)
                print(f"  [RETRY] {card_id}: HTTP {resp.status_code}, waiting {wait:.1f}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return parse_card(resp.text, card_id)
        except requests.RequestException as e:
            wait = (2 ** attempt) * 5 + random.uniform(0, 3)
            print(f"  [RETRY] {card_id}: {e}, waiting {wait:.1f}s...")
            time.sleep(wait)
    print(f"  [FAIL] {card_id}: max retries exceeded")
    return None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Pokemon Card Scraper")
    parser.add_argument("--ids", nargs="+", metavar="CARD_ID", help="Card IDs to fetch (directly specify)")
    parser.add_argument("-f", "--file", help="Path to card ID list file (txt/csv)")
    parser.add_argument("--pack", nargs="+", metavar="PACK_ID", help="Pack IDs to fetch all cards from (e.g. 870 for Scarlet ex)")
    parser.add_argument("--db", default="cards.db", help="SQLite database path (default: cards.db)")
    parser.add_argument("--image-dir", default=None, help="Directory to save card images (omit to skip)")
    parser.add_argument("--min-sleep", type=float, default=3.0, help="Min sleep between requests (default: 3)")
    parser.add_argument("--max-sleep", type=float, default=8.0, help="Max sleep between requests (default: 8)")
    args = parser.parse_args()

    card_ids: list[str] = []
    if args.ids:
        card_ids.extend(args.ids)
    if args.file:
        card_ids.extend(read_card_ids(args.file))
    if args.pack:
        session_for_search = requests.Session()
        for pack_id in args.pack:
            print(f"Fetching card IDs for pack {pack_id}...")
            pack_ids = fetch_pack_card_ids(session_for_search, pack_id)
            card_ids.extend(pack_ids)
            print(f"  → {len(pack_ids)} cards found in pack {pack_id}")
    if not card_ids:
        parser.error("Specify card IDs with --ids, -f/--file, and/or --pack")

    db_path = Path(args.db)
    image_dir = Path(args.image_dir) if args.image_dir else None
    conn = init_db(db_path)
    already_fetched = get_fetched_ids(conn)
    remaining = [cid for cid in card_ids if cid not in already_fetched]

    print(f"Total IDs: {len(card_ids)}, Already fetched: {len(already_fetched)}, Remaining: {len(remaining)}")
    if image_dir:
        print(f"Image download: ON → {image_dir}")

    if not remaining:
        print("All cards already fetched.")
        return

    session = requests.Session()
    success = 0
    fail = 0

    for i, card_id in enumerate(remaining):
        print(f"[{i+1}/{len(remaining)}] Fetching card {card_id}...")
        data = fetch_card(session, card_id)

        if data:
            img_path = None
            if image_dir and data.get("image_url"):
                ext = Path(data["image_url"]).suffix or ".jpg"
                image_dest = image_dir / f"{card_id}{ext}"
                if download_image(session, data["image_url"], image_dest):
                    img_path = str(image_dest)
            save_card(conn, data, img_path)
            success += 1
        else:
            fail += 1

        if i < len(remaining) - 1:
            sleep_time = random.uniform(args.min_sleep, args.max_sleep)
            time.sleep(sleep_time)

    conn.close()
    print(f"\nDone! Success: {success}, Failed: {fail}, DB: {args.db}")


if __name__ == "__main__":
    main()
