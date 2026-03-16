import type { CardResolver } from "../data/card-resolver";
import type { DeckList } from "../types/deck";

const CATEGORY_HEADER = /^(?:ポケモン|グッズ|サポート|スタジアム|エネルギー|ポケモンのどうぐ|特殊エネルギー)\s*[（(]\d+枚[)）]/;
const CARD_LINE = /^(.+?)\s+(\d+)$/;

export function parseDeckList(text: string, resolver: CardResolver): DeckList {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: Array<{ card: ReturnType<CardResolver["findByName"]>[0]; count: number }> = [];
  let totalCount = 0;

  for (const line of lines) {
    if (CATEGORY_HEADER.test(line)) continue;

    const match = CARD_LINE.exec(line);
    if (!match) continue;

    const [, name, countStr] = match;
    const count = parseInt(countStr!, 10);
    if (count <= 0) continue;

    const results = resolver.findByName(name!);
    if (results.length === 0) {
      throw new Error(`カード "${name}" が見つかりません`);
    }

    const existing = entries.find((e) => e.card.canonical_id === results[0]!.canonical_id);
    if (existing) {
      existing.count += count;
    } else {
      entries.push({ card: results[0]!, count });
    }
    totalCount += count;
  }

  return { entries, totalCount };
}
