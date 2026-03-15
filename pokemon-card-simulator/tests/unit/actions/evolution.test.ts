import { describe, it, expect, beforeEach } from "vitest";
import { evolve } from "../../../src/domain/evolution";
import { createInitialGameState } from "../../../src/types/game-state";
import { createPokemonCard, createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";
import type { BasicEnergyCard } from "../../../src/types/card";

describe("FR-34: 進化操作", () => {
  beforeEach(() => resetInstanceCounter());

  function makeState() {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ", card_id: "merep", canonical_id: "merep" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", card_id: "mokoko", canonical_id: "mokoko", stage: "1進化" }));
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.zones.バトル場 = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId];
    return { state, merepId: merep.instanceId, mokokoId: mokoko.instanceId };
  }

  it("手札の進化ポケモンをバトル場のポケモンに重ねて進化させる", () => {
    const { state, merepId, mokokoId } = makeState();
    const result = evolve(state, mokokoId, merepId);

    expect(result.zones.バトル場).toContain(mokokoId);
    expect(result.zones.バトル場).not.toContain(merepId);
    expect(result.zones.手札).not.toContain(mokokoId);
  });

  it("進化前のカードが進化スタックとして保持される", () => {
    const { state, merepId, mokokoId } = makeState();
    const result = evolve(state, mokokoId, merepId);

    expect(result.cardInstances[mokokoId]!.evolutionStack).toContain(merepId);
  });

  it("2段階進化ができる", () => {
    const { state, merepId, mokokoId } = makeState();
    const denryu = createCardInstance(createPokemonCard({ name: "デンリュウ", card_id: "denryu", canonical_id: "denryu", stage: "2進化" }));
    state.cardInstances[denryu.instanceId] = denryu;

    let result = evolve(state, mokokoId, merepId);
    result.zones.手札 = [...result.zones.手札, denryu.instanceId];
    result = evolve(result, denryu.instanceId, mokokoId);

    expect(result.zones.バトル場).toContain(denryu.instanceId);
    expect(result.cardInstances[denryu.instanceId]!.evolutionStack).toContain(merepId);
    expect(result.cardInstances[denryu.instanceId]!.evolutionStack).toContain(mokokoId);
  });

  it("進化してもエネルギー・どうぐ・ダメカンは引き継がれる", () => {
    const { state, merepId, mokokoId } = makeState();
    const energyInst = createCardInstance({
      card_id: "e1", name: "基本雷エネルギー", card_category: "基本エネルギー",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "e1", type: "雷",
    } as BasicEnergyCard);
    const toolInst = createCardInstance({
      card_id: "t1", name: "勇気のおまもり", card_category: "ポケモンのどうぐ",
      image_url: "", regulation: "", card_number: "", rarity: "", canonical_id: "t1",
      effect_text: "", rule_text: "", special_rule: "",
    });
    state.cardInstances[energyInst.instanceId] = energyInst;
    state.cardInstances[toolInst.instanceId] = toolInst;
    state.cardInstances[merepId]!.attachedEnergies = [energyInst.instanceId];
    state.cardInstances[merepId]!.attachedTool = toolInst.instanceId;
    state.cardInstances[merepId]!.damageCounters = 20;

    const result = evolve(state, mokokoId, merepId);
    expect(result.cardInstances[mokokoId]!.attachedEnergies).toContain(energyInst.instanceId);
    expect(result.cardInstances[mokokoId]!.attachedTool).toBe(toolInst.instanceId);
    expect(result.cardInstances[mokokoId]!.damageCounters).toBe(20);
  });

  it("ベンチのポケモンも進化できる", () => {
    const state = createInitialGameState();
    const merep = createCardInstance(createPokemonCard({ name: "メリープ" }));
    const mokoko = createCardInstance(createPokemonCard({ name: "モココ", stage: "1進化" }));
    state.cardInstances[merep.instanceId] = merep;
    state.cardInstances[mokoko.instanceId] = mokoko;
    state.zones.ベンチ = [merep.instanceId];
    state.zones.手札 = [mokoko.instanceId];

    const result = evolve(state, mokoko.instanceId, merep.instanceId);
    expect(result.zones.ベンチ).toContain(mokoko.instanceId);
  });
});
