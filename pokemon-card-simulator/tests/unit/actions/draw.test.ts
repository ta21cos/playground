import { describe, it, expect, beforeEach } from "vitest";
import { drawCards } from "../../../src/domain/card-actions";
import { createDeckWith60Cards, resetInstanceCounter } from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";

describe("FR-14: N枚ドロー", () => {
  beforeEach(() => resetInstanceCounter());

  it.each([
    [1, 8, 52],
    [3, 10, 50],
    [7, 14, 46],
  ])("%d 枚ドロー → 手札 %d, 山札 %d", (n, expectedHand, expectedDeck) => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const result = drawCards(game, n);
    expect(result.zones.手札).toHaveLength(expectedHand);
    expect(result.zones.山札).toHaveLength(expectedDeck);
  });

  it("山札の残り枚数より多くドローすると残り全てを引き警告が出る", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    game.zones.山札 = game.zones.山札.slice(0, 2);
    const handBefore = game.zones.手札.length;

    const result = drawCards(game, 5);
    expect(result.zones.手札).toHaveLength(handBefore + 2);
    expect(result.zones.山札).toHaveLength(0);
    expect(result.warning).toBeDefined();
  });

  it("0以下の枚数は拒否される", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    expect(() => drawCards(game, 0)).toThrow();
  });
});
