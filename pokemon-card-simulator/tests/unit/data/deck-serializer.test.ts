import { describe, it, expect } from "vitest";
import {
  serializeDeck,
  deserializeDeck,
} from "../../../src/domain/deck-serializer";
import { CardResolver } from "../../../src/data/card-resolver";
import { buildCardsJson, type RawCardData } from "../../../scripts/build-cards-json";
import fixtureCards from "../../fixtures/card-data-subset.json";
import type { DeckList } from "../../../src/types/deck";

const cards = buildCardsJson(fixtureCards as RawCardData[]);
const resolver = new CardResolver(cards);

function makeDeckList(): DeckList {
  return {
    entries: [
      { card: resolver.findByName("ピカチュウex")[0]!, count: 4 },
      { card: resolver.findByName("ミストエネルギー")[0]!, count: 56 },
    ],
    totalCount: 60,
  };
}

describe("FR-2: JSON デッキ保存・読み込み", () => {
  it("デッキを JSON にシリアライズできる", () => {
    const deck = makeDeckList();
    const json = serializeDeck(deck);
    expect(json).toBeDefined();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveLength(2);
  });

  it("JSON からデッキをデシリアライズできる", () => {
    const deck = makeDeckList();
    const json = serializeDeck(deck);
    const restored = deserializeDeck(json, resolver);
    expect(restored.totalCount).toBe(60);
    expect(restored.entries).toHaveLength(2);
    const pikachu = restored.entries.find((e) => e.card.name === "ピカチュウex");
    expect(pikachu).toBeDefined();
    expect(pikachu!.count).toBe(4);
  });

  it("各カードにカードデータが紐付いている", () => {
    const deck = makeDeckList();
    const json = serializeDeck(deck);
    const restored = deserializeDeck(json, resolver);
    for (const entry of restored.entries) {
      expect(entry.card.card_id).toBeDefined();
      expect(entry.card.canonical_id).toBeDefined();
    }
  });
});

describe("@edge-case FR-2: デシリアライズのエッジケース", () => {
  it("不正な JSON 文字列をデシリアライズしようとするとパースエラーが発生する", () => {
    expect(() => deserializeDeck("{invalid json}", resolver)).toThrow();
  });

  it("entries フィールドが存在しない JSON をデシリアライズしようとするとエラーが発生する", () => {
    expect(() => deserializeDeck('{"version":1}', resolver)).toThrow();
  });
});
