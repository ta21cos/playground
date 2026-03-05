#!/usr/bin/env python3
"""Pokemon Card Scraper — fetches card data from pokemon-card.com and outputs JSONL."""

import argparse
import json
import random
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.pokemon-card.com/card-search/details.php/card/{card_id}/"

ICON_TO_TYPE = {
    "icon-grass": "草",
    "icon-fire": "炎",
    "icon-water": "水",
    "icon-lightning": "雷",
    "icon-psychic": "超",
    "icon-fighting": "闘",
    "icon-darkness": "悪",
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


def get_loaded_ids(output_path: Path) -> set[str]:
    if not output_path.exists():
        return set()
    loaded = set()
    for line in output_path.read_text().strip().splitlines():
        if not line:
            continue
        try:
            data = json.loads(line)
            loaded.add(str(data.get("card_id", "")))
        except json.JSONDecodeError:
            continue
    return loaded


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

    # Card name
    h1 = section.select_one("h1.Heading1")
    result["name"] = h1.get_text(strip=True) if h1 else ""

    # Image URL
    img = section.select_one(".LeftBox img.fit")
    if img and img.get("src"):
        result["image_url"] = "https://www.pokemon-card.com" + img["src"]
    else:
        result["image_url"] = ""

    # Regulation mark
    reg_img = section.select_one(".subtext .img-regulation")
    result["regulation"] = reg_img.get("alt", "") if reg_img else ""

    # Card number & rarity
    subtext = section.select_one(".subtext")
    if subtext:
        raw = subtext.get_text()
        raw = re.sub(r"\s+", " ", raw).strip()
        # Remove regulation prefix (e.g. "M3") — it's already captured separately
        raw = re.sub(r"^[A-Z][A-Z0-9]*\s*", "", raw).strip()
        # Extract card number pattern like "002 / 080"
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

    # Illustrator
    author_a = section.select_one(".author a")
    result["illustrator"] = author_a.get_text(strip=True) if author_a else ""

    # Pokemon info (図鑑)
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

    # Right box — card stats
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
        })
        _add_pack_info(section, result)
        return result

    # Stage & HP & Type
    stage_el = right.select_one(".TopInfo .td-l .type")
    result["stage"] = stage_el.get_text(strip=True) if stage_el else ""

    hp_el = right.select_one(".hp-num")
    result["hp"] = int(hp_el.get_text(strip=True)) if hp_el else None

    result["type"] = extract_icon_types(right.select_one(".TopInfo .td-r"))

    # Determine card category and parse accordingly
    h2_tags = right.select("h2")
    h2_texts = [h2.get_text(strip=True) for h2 in h2_tags]

    is_pokemon = "ワザ" in h2_texts or result["hp"] is not None
    trainer_categories = ["グッズ", "サポート", "スタジアム", "ポケモンのどうぐ"]
    detected_trainer = ""
    for tc in trainer_categories:
        if tc in h2_texts:
            detected_trainer = tc
            break

    if detected_trainer and not is_pokemon:
        result["card_category"] = detected_trainer
        effect_parts = []
        for p in right.select("p"):
            effect_parts.append(p.get_text(strip=True))
        result["effect_text"] = "\n".join(effect_parts)
        result["stage"] = ""
        result["abilities"] = []
        result["moves"] = []
        result["weakness"] = ""
        result["resistance"] = ""
        result["retreat_cost"] = 0
        result["evolutions"] = []
    else:
        result["card_category"] = "ポケモン"
        result["effect_text"] = ""
        _parse_pokemon_details(right, result)

    _add_pack_info(section, result)
    return result


def _parse_pokemon_details(right, result: dict):
    abilities = []
    moves = []

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

    result["abilities"] = abilities
    result["moves"] = moves

    # Weakness, Resistance, Retreat
    table = right.select_one("table")
    if table:
        rows = table.select("tr")
        if len(rows) >= 2:
            cells = rows[1].select("td")
            result["weakness"] = cells[0].get_text(strip=True) if len(cells) > 0 else ""
            # Prepend weakness type
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

    # Evolutions
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


def _add_pack_info(section, result: dict):
    packs = []
    for li in section.select(".SubSection .List_item a"):
        packs.append(li.get_text(strip=True))
    result["packs"] = packs


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


def main():
    parser = argparse.ArgumentParser(description="Pokemon Card Scraper")
    parser.add_argument("input", help="Path to card ID list (txt: one ID per line, or csv: first column)")
    parser.add_argument("-o", "--output", default="cards.jsonl", help="Output JSONL file path (default: cards.jsonl)")
    parser.add_argument("--min-sleep", type=float, default=3.0, help="Min sleep between requests in seconds (default: 3)")
    parser.add_argument("--max-sleep", type=float, default=8.0, help="Max sleep between requests in seconds (default: 8)")
    args = parser.parse_args()

    card_ids = read_card_ids(args.input)
    if not card_ids:
        print("No card IDs found in input file.")
        sys.exit(1)

    output_path = Path(args.output)
    already_fetched = get_loaded_ids(output_path)
    remaining = [cid for cid in card_ids if cid not in already_fetched]

    print(f"Total IDs: {len(card_ids)}, Already fetched: {len(already_fetched)}, Remaining: {len(remaining)}")

    if not remaining:
        print("All cards already fetched.")
        return

    session = requests.Session()
    success = 0
    fail = 0

    with open(output_path, "a", encoding="utf-8") as f:
        for i, card_id in enumerate(remaining):
            print(f"[{i+1}/{len(remaining)}] Fetching card {card_id}...")
            data = fetch_card(session, card_id)

            if data:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")
                f.flush()
                success += 1
            else:
                fail += 1

            if i < len(remaining) - 1:
                sleep_time = random.uniform(args.min_sleep, args.max_sleep)
                time.sleep(sleep_time)

    print(f"\nDone! Success: {success}, Failed: {fail}, Output: {args.output}")


if __name__ == "__main__":
    main()
