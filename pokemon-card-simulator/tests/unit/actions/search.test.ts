import { describe, it, expect, beforeEach } from "vitest";
import { searchDeck } from "../../../src/domain/card-actions";
import { createDeckWith60Cards, resetInstanceCounter } from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";

describe("FR-13: 山札サーチ", () => {
  beforeEach(() => resetInstanceCounter());

  it("山札の中身を見て任意枚数のカードを手札に加え、山札をシャッフルする", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const target1 = game.zones.山札[0]!;
    const target2 = game.zones.山札[1]!;

    const result = searchDeck(game, [target1, target2]);
    expect(result.zones.手札).toContain(target1);
    expect(result.zones.手札).toContain(target2);
    expect(result.zones.山札).not.toContain(target1);
    expect(result.zones.山札).not.toContain(target2);
  });

  it("カードを選ばずにサーチを終了できる", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const handBefore = game.zones.手札.length;

    const result = searchDeck(game, []);
    expect(result.zones.手札).toHaveLength(handBefore);
  });

  it("山札が0枚の場合サーチすると空", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    game.zones.山札 = [];

    const result = searchDeck(game, []);
    expect(result.zones.山札).toHaveLength(0);
  });
});
