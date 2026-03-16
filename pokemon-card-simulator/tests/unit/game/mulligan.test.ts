import { describe, it, expect, beforeEach } from "vitest";
import { needsMulligan, executeMulligan } from "../../../src/domain/mulligan";
import {
  createDeckWith60Cards,
  createDeckWithoutSeeds,
  resetInstanceCounter,
} from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";

describe("FR-6: マリガン処理", () => {
  beforeEach(() => resetInstanceCounter());

  it("手札にたねポケモンがない場合マリガンが必要と判定される", () => {
    const { state } = createDeckWithoutSeeds();
    const setup = setupGame(state);
    expect(needsMulligan(setup)).toBe(true);
  });

  it("マリガン処理を実行すると手札が戻されて再配布される", () => {
    const { state } = createDeckWithoutSeeds();
    const setup = setupGame(state);
    const result = executeMulligan(setup);

    expect(result.zones.手札).toHaveLength(7);
    expect(result.zones.山札).toHaveLength(53);
  });

  it("手札にたねポケモンがある場合マリガンは不要", () => {
    const { state } = createDeckWith60Cards(4);
    const setup = setupGame(state);

    const hasSeed = setup.zones.手札.some((id) => {
      const instance = setup.cardInstances[id];
      return (
        instance?.card.card_category === "ポケモン" &&
        "stage" in instance.card &&
        instance.card.stage === "たね"
      );
    });

    if (hasSeed) {
      expect(needsMulligan(setup)).toBe(false);
    }
  });
});

describe("@edge-case FR-6: たねポケモンなしの連続マリガン", () => {
  beforeEach(() => resetInstanceCounter());

  it("たねポケモンが1枚もないデッキではマリガンを繰り返しても常にマリガン判定になる", () => {
    const { state } = createDeckWithoutSeeds();
    let current = setupGame(state);

    for (let i = 0; i < 5; i++) {
      expect(needsMulligan(current)).toBe(true);
      current = executeMulligan(current);
      expect(current.zones.手札).toHaveLength(7);
      expect(current.zones.山札).toHaveLength(53);
    }
  });
});
