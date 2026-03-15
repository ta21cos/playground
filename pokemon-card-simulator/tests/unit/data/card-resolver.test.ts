import { describe, it, expect } from "vitest";
import { CardResolver } from "../../../src/data/card-resolver";
import { buildCardsJson, type RawCardData } from "../../../scripts/build-cards-json";
import fixtureCards from "../../fixtures/card-data-subset.json";

const cards = buildCardsJson(fixtureCards as RawCardData[]);

describe("FR-24: canonical_id によるバリアント統合", () => {
  it("同じ canonical_id を持つカードを同一カードとして扱う", () => {
    const resolver = new CardResolver(cards);
    const results = resolver.findByName("テラパゴスex");

    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe("テラパゴスex");
  });

  it("デッキリストのカード名から canonical_id で解決し、N 枚のカードインスタンスを生成する", () => {
    const resolver = new CardResolver(cards);
    const instances = resolver.resolveInstances("ピカチュウex", 4);

    expect(instances).toHaveLength(4);
    for (const instance of instances) {
      expect(instance.name).toBe("ピカチュウex");
      expect(instance.canonical_id).toBeDefined();
    }
  });

  it("存在しないカード名で解決するとエラーを投げる", () => {
    const resolver = new CardResolver(cards);

    expect(() => resolver.resolveInstances("存在しないカード", 1)).toThrow(
      "存在しないカード",
    );
  });
});
