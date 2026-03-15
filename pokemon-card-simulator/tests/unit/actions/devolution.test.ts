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
