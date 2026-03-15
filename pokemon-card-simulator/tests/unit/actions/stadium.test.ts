import { describe, it, expect, beforeEach } from "vitest";
import { placeStadium } from "../../../src/domain/stadium";
import { createInitialGameState } from "../../../src/types/game-state";
import { createCardInstance, resetInstanceCounter } from "../../helpers/deck-factory";

function makeStadiumInstance(name: string) {
  return createCardInstance({
    card_id: `stadium-${name}`,
    name,
    card_category: "スタジアム",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: `stadium-${name}`,
    effect_text: "",
    rule_text: "",
  });
}

describe("FR-37: スタジアム上書き", () => {
  beforeEach(() => resetInstanceCounter());

  it("新しいスタジアムを配置すると既存スタジアムがトラッシュに送られる", () => {
    const state = createInitialGameState();
    const yukimichi = makeStadiumInstance("頂への雪道");
    const bowltown = makeStadiumInstance("ボウルタウン");
    state.cardInstances[yukimichi.instanceId] = yukimichi;
    state.cardInstances[bowltown.instanceId] = bowltown;
    state.zones.スタジアム = [yukimichi.instanceId];
    state.zones.手札 = [bowltown.instanceId];

    const result = placeStadium(state, bowltown.instanceId);
    expect(result.zones.スタジアム).toEqual([bowltown.instanceId]);
    expect(result.zones.トラッシュ).toContain(yukimichi.instanceId);
  });

  it("スタジアムが空の場合はそのまま配置される", () => {
    const state = createInitialGameState();
    const yukimichi = makeStadiumInstance("頂への雪道");
    state.cardInstances[yukimichi.instanceId] = yukimichi;
    state.zones.手札 = [yukimichi.instanceId];

    const result = placeStadium(state, yukimichi.instanceId);
    expect(result.zones.スタジアム).toEqual([yukimichi.instanceId]);
    expect(result.zones.トラッシュ).toHaveLength(0);
  });
});
