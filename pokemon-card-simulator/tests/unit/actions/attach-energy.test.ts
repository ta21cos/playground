import { describe, it, expect, beforeEach } from "vitest";
import { attachEnergy } from "../../../src/domain/attachment";
import { createInitialGameState } from "../../../src/types/game-state";
import {
  createPokemonCard,
  createCardInstance,
  resetInstanceCounter,
} from "../../helpers/deck-factory";
import type { BasicEnergyCard } from "../../../src/types/card";

function makeEnergyInstance() {
  const energy: BasicEnergyCard = {
    card_id: "energy-thunder",
    name: "基本雷エネルギー",
    card_category: "基本エネルギー",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: "basic-energy-雷",
    type: "雷",
  };
  return createCardInstance(energy);
}

describe("FR-17: エネルギー付与", () => {
  beforeEach(() => resetInstanceCounter());

  it("手札のエネルギーをポケモンに付ける", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    const energy = makeEnergyInstance();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[energy.instanceId] = energy;
    state.zones.バトル場 = [pokemon.instanceId];
    state.zones.手札 = [energy.instanceId];

    const result = attachEnergy(state, energy.instanceId, pokemon.instanceId);
    expect(result.cardInstances[pokemon.instanceId]!.attachedEnergies).toContain(energy.instanceId);
    expect(result.zones.手札).not.toContain(energy.instanceId);
  });

  it("複数のエネルギーを同じポケモンに付けられる", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    const energy1 = makeEnergyInstance();
    const energy2 = makeEnergyInstance();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[energy1.instanceId] = energy1;
    state.cardInstances[energy2.instanceId] = energy2;
    state.zones.バトル場 = [pokemon.instanceId];
    state.zones.手札 = [energy1.instanceId, energy2.instanceId];

    let result = attachEnergy(state, energy1.instanceId, pokemon.instanceId);
    result = attachEnergy(result, energy2.instanceId, pokemon.instanceId);
    expect(result.cardInstances[pokemon.instanceId]!.attachedEnergies).toHaveLength(2);
  });

  it("ベンチのポケモンにもエネルギーを付けられる", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const energy = makeEnergyInstance();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[energy.instanceId] = energy;
    state.zones.ベンチ = [pokemon.instanceId];
    state.zones.手札 = [energy.instanceId];

    const result = attachEnergy(state, energy.instanceId, pokemon.instanceId);
    expect(result.cardInstances[pokemon.instanceId]!.attachedEnergies).toContain(energy.instanceId);
  });

  it("ポケモン以外にエネルギーを付けるとエラー", () => {
    const state = createInitialGameState();
    const stadiumInstance = createCardInstance({
      card_id: "stadium-1",
      name: "頂への雪道",
      card_category: "スタジアム",
      image_url: "",
      regulation: "",
      card_number: "",
      rarity: "",
      canonical_id: "stadium-1",
      effect_text: "",
      rule_text: "",
    });
    const energy = makeEnergyInstance();
    state.cardInstances[stadiumInstance.instanceId] = stadiumInstance;
    state.cardInstances[energy.instanceId] = energy;
    state.zones.スタジアム = [stadiumInstance.instanceId];
    state.zones.手札 = [energy.instanceId];

    expect(() => attachEnergy(state, energy.instanceId, stadiumInstance.instanceId)).toThrow();
  });
});
