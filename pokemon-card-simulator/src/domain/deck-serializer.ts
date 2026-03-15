import type { CardResolver } from "../data/card-resolver";
import type { DeckJson, DeckList } from "../types/deck";

export function serializeDeck(deck: DeckList): string {
  const json: DeckJson = {
    version: 1,
    entries: deck.entries.map((e) => ({
      name: e.card.name,
      count: e.count,
    })),
  };
  return JSON.stringify(json);
}

export function deserializeDeck(
  jsonStr: string,
  resolver: CardResolver,
): DeckList {
  const json: DeckJson = JSON.parse(jsonStr);
  const entries = json.entries.map((e) => {
    const results = resolver.findByName(e.name);
    if (results.length === 0) {
      throw new Error(`カード "${e.name}" が見つかりません`);
    }
    return { card: results[0]!, count: e.count };
  });
  const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
  return { entries, totalCount };
}
