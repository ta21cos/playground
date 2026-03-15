import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Card } from "../../../src/components/Card";
import type { PokemonCard as PokemonCardType } from "../../../src/types/card";

const mockCard: PokemonCardType = {
  card_id: "test-1",
  name: "ピカチュウex",
  card_category: "ポケモン",
  image_url: "https://www.pokemon-card.com/assets/images/card_images/large/test.jpg",
  regulation: "SV1",
  card_number: "001/071",
  rarity: "RR",
  canonical_id: "test-1",
  stage: "たね",
  hp: 200,
  type: ["雷"],
  abilities: [],
  moves: [],
  weakness: "闘×2",
  resistance: "",
  retreat_cost: 1,
  effect_text: "",
  rule_text: "",
  special_rule: "",
};

describe("FR-18: カード画像表示", () => {
  it("image_url を使用してカード画像が表示される", () => {
    render(<Card card={mockCard} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", mockCard.image_url);
    expect(img).toHaveAttribute("alt", "ピカチュウex");
  });
});

describe("FR-19: フォールバック表示", () => {
  it("画像が読み込めない場合にカード名とカテゴリが表示される", () => {
    render(<Card card={mockCard} />);
    const img = screen.getByRole("img");

    fireEvent.error(img);

    expect(screen.getByText("ピカチュウex")).toBeDefined();
    expect(screen.getByText("ポケモン")).toBeDefined();
  });
});
