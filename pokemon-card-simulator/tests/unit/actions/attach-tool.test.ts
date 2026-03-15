import { describe, it, expect, beforeEach } from "vitest";
import { attachTool } from "../../../src/domain/attachment";
import { createInitialGameState } from "../../../src/types/game-state";
import {
  createPokemonCard,
  createCardInstance,
  resetInstanceCounter,
} from "../../helpers/deck-factory";

function makeToolInstance(name = "勇気のおまもり") {
  return createCardInstance({
    card_id: `tool-${name}`,
    name,
    card_category: "ポケモンのどうぐ",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: `tool-${name}`,
    effect_text: "",
    rule_text: "",
    special_rule: "",
  });
}

describe("FR-29: どうぐ付与", () => {
  beforeEach(() => resetInstanceCounter());

  it("どうぐカードをポケモンに付ける", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const tool = makeToolInstance();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[tool.instanceId] = tool;
    state.zones.バトル場 = [pokemon.instanceId];
    state.zones.手札 = [tool.instanceId];

    const result = attachTool(state, tool.instanceId, pokemon.instanceId);
    expect(result.cardInstances[pokemon.instanceId]!.attachedTool).toBe(tool.instanceId);
    expect(result.zones.手札).not.toContain(tool.instanceId);
  });

  it("すでにどうぐが付いているポケモンには付けられない", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const tool1 = makeToolInstance("勇気のおまもり");
    const tool2 = makeToolInstance("まけんきハチマキ");
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[tool1.instanceId] = tool1;
    state.cardInstances[tool2.instanceId] = tool2;
    state.zones.バトル場 = [pokemon.instanceId];
    state.zones.手札 = [tool1.instanceId, tool2.instanceId];

    const result = attachTool(state, tool1.instanceId, pokemon.instanceId);
    expect(() => attachTool(result, tool2.instanceId, pokemon.instanceId)).toThrow();
  });

  it("ベンチのポケモンにもどうぐを付けられる", () => {
    const state = createInitialGameState();
    const pokemon = createCardInstance(createPokemonCard());
    const tool = makeToolInstance();
    state.cardInstances[pokemon.instanceId] = pokemon;
    state.cardInstances[tool.instanceId] = tool;
    state.zones.ベンチ = [pokemon.instanceId];
    state.zones.手札 = [tool.instanceId];

    const result = attachTool(state, tool.instanceId, pokemon.instanceId);
    expect(result.cardInstances[pokemon.instanceId]!.attachedTool).toBe(tool.instanceId);
  });

  it("ポケモン以外にどうぐを付けるとエラー", () => {
    const state = createInitialGameState();
    const item = createCardInstance({
      card_id: "item-1",
      name: "ネストボール",
      card_category: "グッズ",
      image_url: "",
      regulation: "",
      card_number: "",
      rarity: "",
      canonical_id: "item-1",
      effect_text: "",
      rule_text: "",
    });
    const tool = makeToolInstance();
    state.cardInstances[item.instanceId] = item;
    state.cardInstances[tool.instanceId] = tool;
    state.zones.手札 = [tool.instanceId, item.instanceId];

    expect(() => attachTool(state, tool.instanceId, item.instanceId)).toThrow();
  });
});
