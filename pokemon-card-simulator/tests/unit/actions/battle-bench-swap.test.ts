import { describe, it, expect, beforeEach } from "vitest";
import { moveToBench, promoteToBattle, needsBenchSelector } from "../../../src/domain/battle-bench-swap";
import { createInitialGameState } from "../../../src/types/game-state";
import { createPokemonCard, createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";

describe("FR-36: バトル場/ベンチ入れ替え", () => {
  beforeEach(() => resetInstanceCounter());

  it("バトル場のポケモンをベンチに移動する", () => {
    const state = createInitialGameState();
    const pika = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    state.cardInstances[pika.instanceId] = pika;
    state.cardInstances[merep.instanceId] = merep;
    state.zones.バトル場 = [pika.instanceId];
    state.zones.ベンチ = [merep.instanceId];

    const result = moveToBench(state, pika.instanceId);
    expect(result.zones.ベンチ).toContain(pika.instanceId);
    expect(result.zones.バトル場).toHaveLength(0);
  });

  it("バトル場が空になるとベンチからポケモンを選ぶ必要がある", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    state.cardInstances[merep.instanceId] = merep;
    state.zones.バトル場 = [];
    state.zones.ベンチ = [merep.instanceId];

    expect(needsBenchSelector(state)).toBe(true);

    const result = promoteToBattle(state, merep.instanceId);
    expect(result.zones.バトル場).toContain(merep.instanceId);
    expect(result.zones.ベンチ).not.toContain(merep.instanceId);
  });

  it("ベンチにポケモンがいない場合はバトル場を空にできる", () => {
    const state = createInitialGameState();
    state.zones.バトル場 = [];
    state.zones.ベンチ = [];

    expect(needsBenchSelector(state)).toBe(false);
  });
});

describe("@edge-case FR-36: バトル場/ベンチ入れ替えのエッジケース", () => {
  beforeEach(() => resetInstanceCounter());

  it("ベンチが満杯のときにバトル場のポケモンをベンチに移動しようとすると拒否される", () => {
    const state = createInitialGameState();
    const battle = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    state.cardInstances[battle.instanceId] = battle;
    state.zones.バトル場 = [battle.instanceId];

    const benchIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const benchPoke = createCardInstance(createPokemonCard({ name: `ベンチ${i}` }));
      state.cardInstances[benchPoke.instanceId] = benchPoke;
      benchIds.push(benchPoke.instanceId);
    }
    state.zones.ベンチ = benchIds;
    state.benchMaxSize = 5;

    expect(() => moveToBench(state, battle.instanceId)).toThrow("ベンチが満杯");
    expect(state.zones.ベンチ).toHaveLength(5);
  });
});
