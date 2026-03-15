import { describe, it, expect } from "vitest";
import { ZONE_NAMES } from "../../../src/types/zone";
import { createInitialGameState } from "../../../src/types/game-state";
import { moveCard, setBenchMaxSize } from "../../../src/domain/zone-actions";

describe("FR-12: ゾーン定義", () => {
  const expectedZones = [
    "山札",
    "手札",
    "サイド",
    "バトル場",
    "ベンチ",
    "トラッシュ",
    "スタジアム",
  ];

  it.each(expectedZones)("ゾーン '%s' が定義されている", (zoneName) => {
    expect(ZONE_NAMES).toContain(zoneName);
  });

  it("ゾーン間でカードを移動できる", () => {
    const state = createInitialGameState();
    state.zones.手札 = ["card-1"];
    state.cardInstances["card-1"] = {
      instanceId: "card-1",
      card: {
        card_id: "test",
        name: "ピカチュウex",
        card_category: "ポケモン",
        image_url: "",
        regulation: "",
        card_number: "",
        rarity: "",
        canonical_id: "test",
        stage: "たね",
        hp: 200,
        type: ["雷"],
        abilities: [],
        moves: [],
        weakness: "",
        resistance: "",
        retreat_cost: 1,
        effect_text: "",
        rule_text: "",
        special_rule: "",
      },
      attachedEnergies: [],
      attachedTool: null,
      evolutionStack: [],
      damageCounters: 0,
    };

    const newState = moveCard(state, "card-1", "手札", "バトル場");
    expect(newState.zones.バトル場).toContain("card-1");
    expect(newState.zones.手札).not.toContain("card-1");
  });

  it("ベンチのデフォルト枠数は 5", () => {
    const state = createInitialGameState();
    expect(state.benchMaxSize).toBe(5);
  });
});

describe("FR-12a: ベンチ拡張", () => {
  it.each([
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 7],
    [6, 5],
  ])(
    "ベンチ枠数を %d から %d に変更できる",
    (before, after) => {
      const state = createInitialGameState();
      state.benchMaxSize = before;
      const result = setBenchMaxSize(state, after);
      expect(result.benchMaxSize).toBe(after);
    },
  );

  it("ベンチ枠数を 5 未満にはできない", () => {
    const state = createInitialGameState();
    state.benchMaxSize = 5;
    const result = setBenchMaxSize(state, 4);
    expect(result.benchMaxSize).toBe(5);
  });

  it("ベンチ枠数を 9 以上にはできない", () => {
    const state = createInitialGameState();
    state.benchMaxSize = 8;
    const result = setBenchMaxSize(state, 9);
    expect(result.benchMaxSize).toBe(8);
  });

  it("ベンチのポケモン数が超過する場合は縮小を拒否する", () => {
    const state = createInitialGameState();
    state.benchMaxSize = 6;
    state.zones.ベンチ = ["c1", "c2", "c3", "c4", "c5", "c6"];
    const result = setBenchMaxSize(state, 5);
    expect(result.benchMaxSize).toBe(6);
  });
});
