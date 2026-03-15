import { describe, it, expect, beforeEach } from "vitest";
import { addDamage, setDamage } from "../../../src/domain/damage-counter";
import { createInitialGameState } from "../../../src/types/game-state";
import {
  createPokemonCard,
  createCardInstance,
  resetInstanceCounter,
} from "../../helpers/deck-factory";

describe("FR-25: ダメカン管理", () => {
  beforeEach(() => resetInstanceCounter());

  function makeState() {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.zones.バトル場 = [pokemon.instanceId];
    return { state, pokemonId: pokemon.instanceId };
  }

  it("ポケモンにダメカンを載せる (+10)", () => {
    const { state, pokemonId } = makeState();
    const result = addDamage(state, pokemonId, 10);
    expect(result.cardInstances[pokemonId]!.damageCounters).toBe(10);
  });

  it("ポケモンからダメカンを外す (-10)", () => {
    const { state, pokemonId } = makeState();
    state.cardInstances[pokemonId]!.damageCounters = 30;
    const result = addDamage(state, pokemonId, -10);
    expect(result.cardInstances[pokemonId]!.damageCounters).toBe(20);
  });

  it("任意の値でダメカンを設定できる", () => {
    const { state, pokemonId } = makeState();
    const result = setDamage(state, pokemonId, 120);
    expect(result.cardInstances[pokemonId]!.damageCounters).toBe(120);
  });

  it("ダメカンは 0 未満にならない", () => {
    const { state, pokemonId } = makeState();
    state.cardInstances[pokemonId]!.damageCounters = 0;
    const result = addDamage(state, pokemonId, -10);
    expect(result.cardInstances[pokemonId]!.damageCounters).toBe(0);
  });
});
