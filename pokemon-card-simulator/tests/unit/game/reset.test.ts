import { describe, it, expect, beforeEach } from "vitest";
import { resetGame } from "../../../src/domain/reset";
import { createDeckWith60Cards, resetInstanceCounter } from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";

describe("FR-22: ゲームリセット", () => {
  beforeEach(() => resetInstanceCounter());

  it("同じデッキでゲームをやり直す", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    game.turnNumber = 5;
    game.benchMaxSize = 7;
    game.opponentSideCount = 3;

    const result = resetGame(game);
    expect(result.phase).toBe("デッキ読込済");
    expect(result.deckCards).toEqual(game.deckCards);
    expect(result.benchMaxSize).toBe(5);
    expect(result.opponentSideCount).toBe(6);
    expect(result.turnNumber).toBe(0);
    expect(Object.keys(result.cardInstances)).toHaveLength(0);
  });

  it("リセット後に再度セットアップできる", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const reset = resetGame(game);

    expect(reset.phase).toBe("デッキ読込済");
    expect(reset.deckCards.length).toBe(60);
  });
});
