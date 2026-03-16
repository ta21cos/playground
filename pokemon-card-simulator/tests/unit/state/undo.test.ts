import { describe, it, expect } from "vitest";
import { takeSnapshot, restoreSnapshot } from "../../../src/store/snapshot";
import { createInitialGameState } from "../../../src/types/game-state";
import { moveCard } from "../../../src/domain/zone-actions";

describe("FR-20: Undo", () => {
  it("直前の操作を巻き戻す", () => {
    const state = createInitialGameState();
    state.zones.手札 = ["card-1"];
    state.cardInstances["card-1"] = {
      instanceId: "card-1",
      card: { card_id: "c1", name: "ネストボール", card_category: "グッズ", image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "c1", effect_text: "", rule_text: "" },
      attachedEnergies: [],
      attachedTool: null,
      evolutionStack: [],
      damageCounters: 0,
    };

    const snapshot = takeSnapshot(state);
    const moved = moveCard(state, "card-1", "手札", "トラッシュ");
    expect(moved.zones.トラッシュ).toContain("card-1");

    const undone = restoreSnapshot(snapshot);
    expect(undone.zones.手札).toContain("card-1");
    expect(undone.zones.トラッシュ).not.toContain("card-1");
  });

  it("複数回 Undo できる（スナップショットスタック）", () => {
    const snapshots: ReturnType<typeof takeSnapshot>[] = [];
    let state = createInitialGameState();
    state.zones.手札 = ["a", "b", "c"];

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "a", "手札", "トラッシュ");

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "b", "手札", "トラッシュ");

    const undo1 = restoreSnapshot(snapshots[1]!);
    expect(undo1.zones.手札).toEqual(["b", "c"]);

    const undo2 = restoreSnapshot(snapshots[0]!);
    expect(undo2.zones.手札).toEqual(["a", "b", "c"]);
  });

  it("Undo する操作がない場合は何も変わらない", () => {
    const state = createInitialGameState();
    const snapshot = takeSnapshot(state);
    const restored = restoreSnapshot(snapshot);
    expect(restored).toEqual(state);
  });
});

describe("@edge-case FR-20: Undoのエッジケース", () => {
  it("Undo を連打してゲーム開始直後の状態まで戻る", () => {
    const snapshots: ReturnType<typeof takeSnapshot>[] = [];
    let state = createInitialGameState();
    state.zones.手札 = ["a", "b", "c", "d", "e"];
    state.turnNumber = 1;
    state.phase = "進行中";

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "a", "手札", "トラッシュ");

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "b", "手札", "トラッシュ");

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "c", "手札", "トラッシュ");

    const undo1 = restoreSnapshot(snapshots[2]!);
    expect(undo1.zones.手札).toEqual(["c", "d", "e"]);

    const undo2 = restoreSnapshot(snapshots[1]!);
    expect(undo2.zones.手札).toEqual(["b", "c", "d", "e"]);

    const undoAll = restoreSnapshot(snapshots[0]!);
    expect(undoAll.zones.手札).toEqual(["a", "b", "c", "d", "e"]);
    expect(undoAll.turnNumber).toBe(1);
  });

  it("セットアップ中で Undo 履歴が空のとき復元しても状態が壊れない", () => {
    const state = createInitialGameState();
    state.phase = "セットアップ中";
    const snapshot = takeSnapshot(state);
    const restored = restoreSnapshot(snapshot);
    expect(restored.phase).toBe("セットアップ中");
    expect(restored).toEqual(state);
  });

  it("Undo 後に操作を行い、さらに Undo する（履歴分岐後の Undo）", () => {
    const snapshots: ReturnType<typeof takeSnapshot>[] = [];
    let state = createInitialGameState();
    state.zones.手札 = ["a", "b", "c"];

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "a", "手札", "トラッシュ");

    snapshots.push(takeSnapshot(state));
    state = moveCard(state, "b", "手札", "トラッシュ");

    state = restoreSnapshot(snapshots[1]!);
    expect(state.zones.手札).toEqual(["b", "c"]);

    const newSnapshots: ReturnType<typeof takeSnapshot>[] = [takeSnapshot(state)];
    state = moveCard(state, "c", "手札", "トラッシュ");

    const undoC = restoreSnapshot(newSnapshots[0]!);
    expect(undoC.zones.手札).toEqual(["b", "c"]);
    expect(undoC.zones.トラッシュ).toEqual(["a"]);
  });
});
