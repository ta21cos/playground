import { describe, it, expect, beforeEach } from "vitest";
import { evolve, devolve } from "../../../src/domain/evolution";
import { createInitialGameState } from "../../../src/types/game-state";
import { createPokemonCard, createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";

describe("FR-35: 退化操作", () => {
  beforeEach(() => resetInstanceCounter());

  it("退化するとバトル場が進化前に戻り、進化カードが手札に移動する", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId];

    const evolved = evolve(state, mokoko.instanceId, merep.instanceId);
    const devolved = devolve(evolved, mokoko.instanceId);

    expect(devolved.zones.バトル場).toContain(merep.instanceId);
    expect(devolved.zones.手札).toContain(mokoko.instanceId);
  });

  it("2段階進化から1段階退化する", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    const denryu = createCardInstance(createPokemonCard({ name: "デンリュウ", stage: "2進化" }));
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.cardInstances[denryu.instanceId] = denryu;
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId, denryu.instanceId];

    let result = evolve(state, mokoko.instanceId, merep.instanceId);
    result = evolve(result, denryu.instanceId, mokoko.instanceId);
    const devolved = devolve(result, denryu.instanceId);

    expect(devolved.zones.バトル場).toContain(mokoko.instanceId);
    expect(devolved.zones.手札).toContain(denryu.instanceId);
    expect(devolved.cardInstances[mokoko.instanceId]!.evolutionStack).toContain(merep.instanceId);
  });
});

describe("@edge-case FR-35: 退化のエッジケース", () => {
  beforeEach(() => resetInstanceCounter());

  it("たねポケモンに退化を実行しようとするとエラーが発生する", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    state.cardInstances[merep.instanceId] = merep;
    state.zones.バトル場 = [merep.instanceId];

    expect(() => devolve(state, merep.instanceId)).toThrow("退化できません");
  });

  it("3段階進化から連続 2 回退化して最初のたねポケモンまで戻せる", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    const denryu = createCardInstance(createPokemonCard({ name: "デンリュウ", stage: "2進化" }));
    const energyInst = createCardInstance({
      card_id: "e1", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e1", type: "雷",
    } as import("../../../src/types/card").BasicEnergyCard);

    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.cardInstances[denryu.instanceId] = denryu;
    state.cardInstances[energyInst.instanceId] = energyInst;
    merep.attachedEnergies = [energyInst.instanceId];
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId, denryu.instanceId];

    let result = evolve(state, mokoko.instanceId, merep.instanceId);
    result = evolve(result, denryu.instanceId, mokoko.instanceId);

    expect(result.cardInstances[denryu.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);

    result = devolve(result, denryu.instanceId);
    expect(result.zones.バトル場).toContain(mokoko.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);

    result = devolve(result, mokoko.instanceId);
    expect(result.zones.バトル場).toContain(merep.instanceId);
    expect(result.cardInstances[merep.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);
    expect(result.cardInstances[merep.instanceId]!.evolutionStack).toHaveLength(0);
  });

  it("退化後に再進化すると付与カードが正しく引き継がれる", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    const energyInst = createCardInstance({
      card_id: "e1", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e1", type: "雷",
    } as import("../../../src/types/card").BasicEnergyCard);
    const toolInst = createCardInstance({
      card_id: "t1", name: "勇気のおまもり", card_category: "ポケモンのどうぐ",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "t1",
      effect_text: "", rule_text: "", special_rule: "",
    });

    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.cardInstances[energyInst.instanceId] = energyInst;
    state.cardInstances[toolInst.instanceId] = toolInst;
    merep.attachedEnergies = [energyInst.instanceId];
    merep.attachedTool = toolInst.instanceId;
    merep.damageCounters = 30;
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId];

    let result = evolve(state, mokoko.instanceId, merep.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.attachedTool).toBe(toolInst.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.damageCounters).toBe(30);

    result = devolve(result, mokoko.instanceId);
    expect(result.cardInstances[merep.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);
    expect(result.cardInstances[merep.instanceId]!.attachedTool).toBe(toolInst.instanceId);
    expect(result.cardInstances[merep.instanceId]!.damageCounters).toBe(30);

    result = evolve(result, mokoko.instanceId, merep.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.attachedEnergies).toContain(energyInst.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.attachedTool).toBe(toolInst.instanceId);
    expect(result.cardInstances[mokoko.instanceId]!.damageCounters).toBe(30);
  });
});
