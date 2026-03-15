import { describe, it, expect } from "vitest";
import { buildCardsJson, type RawCardData } from "../../../scripts/build-cards-json";
import fixtureCards from "../../fixtures/card-data-subset.json";

describe("FR-23: cards.db → JSON 変換", () => {
  const rawCards = fixtureCards as RawCardData[];

  it("全カードの card_id, name, card_category, canonical_id が含まれる", () => {
    const result = buildCardsJson(rawCards);

    for (const raw of rawCards) {
      const card = result.find((c) => c.card_id === raw.card_id);
      expect(card, `card_id=${raw.card_id} が結果に含まれること`).toBeDefined();
      expect(card!.name).toBe(raw.name);
      expect(card!.card_category).toBe(raw.card_category);
      expect(card!.canonical_id).toBe(raw.canonical_id);
    }
  });

  it("ポケモンカードには stage, hp, type, moves, weakness, resistance, retreat_cost が含まれる", () => {
    const result = buildCardsJson(rawCards);
    const pokemon = result.find((c) => c.card_category === "ポケモン");
    expect(pokemon).toBeDefined();
    expect(pokemon).toHaveProperty("stage");
    expect(pokemon).toHaveProperty("hp");
    expect(pokemon).toHaveProperty("type");
    expect(pokemon).toHaveProperty("moves");
    expect(pokemon).toHaveProperty("weakness");
    expect(pokemon).toHaveProperty("resistance");
    expect(pokemon).toHaveProperty("retreat_cost");
  });

  it("トレーナーズカードには effect_text, rule_text が含まれる", () => {
    const result = buildCardsJson(rawCards);
    const trainer = result.find(
      (c) =>
        c.card_category === "グッズ" ||
        c.card_category === "サポート" ||
        c.card_category === "スタジアム" ||
        c.card_category === "ポケモンのどうぐ",
    );
    expect(trainer).toBeDefined();
    expect(trainer).toHaveProperty("effect_text");
    expect(trainer).toHaveProperty("rule_text");
  });

  it("不要なフィールド(illustrator, flavor_text, pokedex_info)を含めない", () => {
    const result = buildCardsJson(rawCards);
    for (const card of result) {
      expect(card).not.toHaveProperty("illustrator");
      expect(card).not.toHaveProperty("flavor_text");
      expect(card).not.toHaveProperty("pokedex_info");
    }
  });

  it("全レコードが出力される", () => {
    const result = buildCardsJson(rawCards);
    expect(result).toHaveLength(rawCards.length);
  });
});
