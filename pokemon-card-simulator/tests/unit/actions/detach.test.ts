import { describe, it, expect, beforeEach } from "vitest";
import { detachEnergy, detachTool, detachEnergyToTarget } from "../../../src/domain/attachment-cleanup";
import { createInitialGameState } from "../../../src/types/game-state";
import { createPokemonCard, createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";
import type { BasicEnergyCard } from "../../../src/types/card";

describe("FR-31: 付与カードの個別取り外し", () => {
  beforeEach(() => resetInstanceCounter());

  it("付いているエネルギーを個別にトラッシュへ移動する", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const e1 = createCardInstance({
      card_id: "e1", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e1", type: "雷",
    } as BasicEnergyCard);
    const e2 = createCardInstance({
      card_id: "e2", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e2", type: "雷",
    } as BasicEnergyCard);
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[e1.instanceId] = e1;
    state.cardInstances[e2.instanceId] = e2;
    pokemon.attachedEnergies = [e1.instanceId, e2.instanceId];
    state.zones.バトル場 = [pokemon.instanceId];

    const result = detachEnergy(state, pokemon.instanceId, e1.instanceId, "トラッシュ");
    expect(result.cardInstances[pokemon.instanceId]!.attachedEnergies).toHaveLength(1);
    expect(result.zones.トラッシュ).toContain(e1.instanceId);
  });

  it("付いているエネルギーを他のポケモンに移動する", () => {
    const state = createInitialGameState();
    const pika = createCardInstance(createPokemonCard({ name: "ピカチュウex" }));
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const energy = createCardInstance({
      card_id: "e1", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e1", type: "雷",
    } as BasicEnergyCard);
    state.cardInstances[pika.instanceId] = pika;
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[energy.instanceId] = energy;
    pika.attachedEnergies = [energy.instanceId];
    state.zones.バトル場 = [pika.instanceId];
    state.zones.ベンチ = [merep.instanceId];

    const result = detachEnergyToTarget(state, pika.instanceId, energy.instanceId, merep.instanceId);
    expect(result.cardInstances[pika.instanceId]!.attachedEnergies).toHaveLength(0);
    expect(result.cardInstances[merep.instanceId]!.attachedEnergies).toContain(energy.instanceId);
  });

  it("付いているどうぐを個別にトラッシュへ移動する", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const tool = createCardInstance({
      card_id: "t1", name: "勇気のおまもり", card_category: "ポケモンのどうぐ",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "t1",
      effect_text: "", rule_text: "", special_rule: "",
    });
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[tool.instanceId] = tool;
    pokemon.attachedTool = tool.instanceId;
    state.zones.バトル場 = [pokemon.instanceId];

    const result = detachTool(state, pokemon.instanceId, "トラッシュ");
    expect(result.cardInstances[pokemon.instanceId]!.attachedTool).toBeNull();
    expect(result.zones.トラッシュ).toContain(tool.instanceId);
  });
});
