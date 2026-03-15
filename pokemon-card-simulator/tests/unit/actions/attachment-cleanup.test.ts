import { describe, it, expect, beforeEach } from "vitest";
import { moveCardWithCleanup } from "../../../src/domain/attachment-cleanup";
import { createInitialGameState } from "../../../src/types/game-state";
import { createPokemonCard, createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";
import type { BasicEnergyCard } from "../../../src/types/card";
import { evolve } from "../../../src/domain/evolution";

describe("FR-30: ポケモン移動時の付与カード自動トラッシュ", () => {
  beforeEach(() => resetInstanceCounter());

  function makeEnergy() {
    return createCardInstance({
      card_id: "e", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e", type: "雷",
    } as BasicEnergyCard);
  }

  function makeTool() {
    return createCardInstance({
      card_id: "t", name: "勇気のおまもり", card_category: "ポケモンのどうぐ",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "t",
      effect_text: "", rule_text: "", special_rule: "",
    });
  }

  it("ポケモンをトラッシュに送るとエネルギーも一緒にトラッシュへ", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const e1 = makeEnergy();
    const e2 = makeEnergy();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[e1.instanceId] = e1;
    state.cardInstances[e2.instanceId] = e2;
    pokemon.attachedEnergies = [e1.instanceId, e2.instanceId];
    state.zones.バトル場 = [pokemon.instanceId];

    const result = moveCardWithCleanup(state, pokemon.instanceId, "バトル場", "トラッシュ");
    expect(result.zones.トラッシュ).toContain(pokemon.instanceId);
    expect(result.zones.トラッシュ).toContain(e1.instanceId);
    expect(result.zones.トラッシュ).toContain(e2.instanceId);
  });

  it("ポケモンをトラッシュに送るとどうぐも一緒にトラッシュへ", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const tool = makeTool();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[tool.instanceId] = tool;
    pokemon.attachedTool = tool.instanceId;
    state.zones.バトル場 = [pokemon.instanceId];

    const result = moveCardWithCleanup(state, pokemon.instanceId, "バトル場", "トラッシュ");
    expect(result.zones.トラッシュ).toContain(tool.instanceId);
  });

  it("エネルギー・どうぐ・進化元すべてがトラッシュへ", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    const energy = makeEnergy();
    const tool = makeTool();
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.cardInstances[energy.instanceId] = energy;
    state.cardInstances[tool.instanceId] = tool;
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId];

    let result = evolve(state, mokoko.instanceId, merep.instanceId);
    result.cardInstances[mokoko.instanceId]!.attachedEnergies = [energy.instanceId];
    result.cardInstances[mokoko.instanceId]!.attachedTool = tool.instanceId;

    result = moveCardWithCleanup(result, mokoko.instanceId, "バトル場", "トラッシュ");
    expect(result.zones.トラッシュ).toContain(mokoko.instanceId);
    expect(result.zones.トラッシュ).toContain(merep.instanceId);
    expect(result.zones.トラッシュ).toContain(energy.instanceId);
    expect(result.zones.トラッシュ).toContain(tool.instanceId);
  });

  it("ポケモンを手札に戻した場合も付与カードはトラッシュへ", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const energy = makeEnergy();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[energy.instanceId] = energy;
    pokemon.attachedEnergies = [energy.instanceId];
    state.zones.バトル場 = [pokemon.instanceId];

    const result = moveCardWithCleanup(state, pokemon.instanceId, "バトル場", "手札");
    expect(result.zones.手札).toContain(pokemon.instanceId);
    expect(result.zones.トラッシュ).toContain(energy.instanceId);
  });
});
