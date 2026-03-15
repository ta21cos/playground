import { describe, it, expect, beforeEach } from "vitest";
import { returnToDeckTop, returnToDeckBottom } from "../../../src/domain/card-actions";
import { createDeckWith60Cards, resetInstanceCounter } from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";

describe("FR-15: 手札を山札に戻す", () => {
  beforeEach(() => resetInstanceCounter());

  it("手札のカードを山札の上に戻す", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const target = game.zones.手札[0]!;

    const result = returnToDeckTop(game, target);
    expect(result.zones.手札).not.toContain(target);
    expect(result.zones.山札[0]).toBe(target);
  });

  it("手札のカードを山札の下に戻す", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    const target = game.zones.手札[0]!;

    const result = returnToDeckBottom(game, target);
    expect(result.zones.手札).not.toContain(target);
    expect(result.zones.山札[result.zones.山札.length - 1]).toBe(target);
  });
});
