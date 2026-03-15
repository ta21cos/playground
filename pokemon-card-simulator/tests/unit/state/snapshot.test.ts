import { describe, it, expect } from "vitest";
import { createInitialGameState } from "../../../src/types/game-state";
import { takeSnapshot, restoreSnapshot } from "../../../src/store/snapshot";

describe("NFR-5: スナップショット方式", () => {
  it("操作後にゲーム状態のスナップショットが保存される", () => {
    const state = createInitialGameState();
    state.zones.手札 = ["card-1"];
    state.turnNumber = 3;

    const snapshot = takeSnapshot(state);
    expect(snapshot).toBeDefined();
    expect(snapshot.zones.手札).toEqual(["card-1"]);
    expect(snapshot.turnNumber).toBe(3);
  });

  it("スナップショットからゲーム状態を完全に復元できる", () => {
    const state = createInitialGameState();
    state.zones.手札 = ["card-1", "card-2"];
    state.zones.ベンチ = ["card-3"];
    state.turnNumber = 5;
    state.benchMaxSize = 7;
    state.opponentSideCount = 4;
    state.cardInstances["card-1"] = {
      instanceId: "card-1",
      card: {
        card_id: "test",
        name: "Test",
        card_category: "グッズ",
        image_url: "",
        regulation: "",
        card_number: "",
        rarity: "",
        canonical_id: "test",
        effect_text: "",
        rule_text: "",
      },
      attachedEnergies: ["energy-1"],
      attachedTool: "tool-1",
      evolutionStack: ["evo-1"],
      damageCounters: 30,
    };

    const snapshot = takeSnapshot(state);

    state.zones.手札 = [];
    state.turnNumber = 10;
    state.benchMaxSize = 5;

    const restored = restoreSnapshot(snapshot);
    expect(restored.zones.手札).toEqual(["card-1", "card-2"]);
    expect(restored.zones.ベンチ).toEqual(["card-3"]);
    expect(restored.turnNumber).toBe(5);
    expect(restored.benchMaxSize).toBe(7);
    expect(restored.opponentSideCount).toBe(4);
    expect(restored.cardInstances["card-1"]?.attachedEnergies).toEqual([
      "energy-1",
    ]);
    expect(restored.cardInstances["card-1"]?.attachedTool).toBe("tool-1");
    expect(restored.cardInstances["card-1"]?.evolutionStack).toEqual([
      "evo-1",
    ]);
    expect(restored.cardInstances["card-1"]?.damageCounters).toBe(30);
  });
});
