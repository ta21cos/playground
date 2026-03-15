import { describe, it, expect } from "vitest";
import { BASIC_ENERGIES } from "../../../src/data/basic-energies";

describe("FR-4: 基本エネルギー定義", () => {
  const energyEntries: Array<{ name: string; type: string }> = [
    { name: "基本草エネルギー", type: "草" },
    { name: "基本炎エネルギー", type: "炎" },
    { name: "基本水エネルギー", type: "水" },
    { name: "基本雷エネルギー", type: "雷" },
    { name: "基本超エネルギー", type: "超" },
    { name: "基本闘エネルギー", type: "闘" },
    { name: "基本悪エネルギー", type: "悪" },
    { name: "基本鋼エネルギー", type: "鋼" },
  ];

  it.each(energyEntries)(
    "$name が存在し、card_category は '基本エネルギー'、type は '$type' である",
    ({ name, type }) => {
      const energy = BASIC_ENERGIES.find((e) => e.name === name);
      expect(energy).toBeDefined();
      expect(energy!.card_category).toBe("基本エネルギー");
      expect(energy!.type).toBe(type);
    },
  );

  it("基本エネルギーは正確に 8 種のみ", () => {
    expect(BASIC_ENERGIES).toHaveLength(8);
  });
});
