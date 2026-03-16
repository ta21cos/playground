import { describe, it, expect } from "vitest";
import { parseDeckList } from "../../../src/domain/deck-parser";
import { CardResolver } from "../../../src/data/card-resolver";
import { buildCardsJson, type RawCardData } from "../../../scripts/build-cards-json";
import fixtureCards from "../../fixtures/card-data-subset.json";

const cards = buildCardsJson(fixtureCards as RawCardData[]);
const resolver = new CardResolver(cards);

describe("FR-1: テキスト形式デッキ読み込み", () => {
  it("標準的なデッキリストをパースできる", () => {
    const text = `ポケモン (3枚)
ピカチュウex 2
メリープ 1

グッズ (1枚)
ハンドトリマー 1

エネルギー (56枚)
ミストエネルギー 56`;

    const result = parseDeckList(text, resolver);
    expect(result.totalCount).toBe(60);
  });

  it("カード名とカードデータを紐付ける", () => {
    const text = `ピカチュウex 4
ミストエネルギー 56`;

    const result = parseDeckList(text, resolver);
    const pikachu = result.entries.find((e) => e.card.name === "ピカチュウex");
    expect(pikachu).toBeDefined();
    expect(pikachu!.count).toBe(4);
    expect(pikachu!.card.card_category).toBe("ポケモン");
    expect(pikachu!.card.canonical_id).toBeDefined();
  });

  it("カードデータに存在しないカード名が含まれる場合", () => {
    const text = `存在しないカード 4
ミストエネルギー 56`;

    expect(() => parseDeckList(text, resolver)).toThrow("存在しないカード");
  });

  it("カテゴリヘッダーなしのシンプルな形式もパースできる", () => {
    const text = `ピカチュウex 4
ハンドトリマー 4
ミストエネルギー 52`;

    const result = parseDeckList(text, resolver);
    expect(result.totalCount).toBe(60);
  });
});

describe("@edge-case FR-1: デッキ入力のエッジケース", () => {
  it("カード行の枚数が 0 の場合はスキップされる", () => {
    const text = `ピカチュウex 0
ミストエネルギー 60`;

    const result = parseDeckList(text, resolver);
    const pikachu = result.entries.find((e) => e.card.name === "ピカチュウex");
    expect(pikachu).toBeUndefined();
    expect(result.totalCount).toBe(60);
  });

  it("同一カード名が複数行に分かれて記載されている場合は合算される", () => {
    const text = `ピカチュウex 2
ハンドトリマー 4
ピカチュウex 2
ミストエネルギー 52`;

    const result = parseDeckList(text, resolver);
    const pikachu = result.entries.find((e) => e.card.name === "ピカチュウex");
    expect(pikachu).toBeDefined();
    expect(pikachu!.count).toBe(4);
    expect(result.totalCount).toBe(60);
    expect(result.entries.filter((e) => e.card.name === "ピカチュウex")).toHaveLength(1);
  });

  it("入力テキストが完全に空文字の場合", () => {
    const result = parseDeckList("", resolver);
    expect(result.entries).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});
