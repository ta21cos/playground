import { describe, it, expect } from "vitest";
import { validateDeck } from "../../../src/domain/deck-validator";
import type { Card } from "../../../src/types/card";

function makeDummyCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    card_id: `card-${i}`,
    name: `Card ${i}`,
    card_category: "グッズ" as const,
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: `card-${i}`,
    effect_text: "",
    rule_text: "",
  }));
}

describe("FR-3: デッキバリデーション", () => {
  it("60 枚のデッキは有効", () => {
    const result = validateDeck(makeDummyCards(60));
    expect(result.valid).toBe(true);
  });

  it.each([0, 1, 59, 61])("%d 枚のデッキは無効", (count) => {
    const result = validateDeck(makeDummyCards(count));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("60枚");
  });
});
