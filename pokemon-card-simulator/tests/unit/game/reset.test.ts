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

describe("@edge-case FR-22: リセットのエッジケース", () => {
  beforeEach(() => resetInstanceCounter());

  it("セットアップ中にリセットすると 'デッキ読込済' に戻る", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    expect(game.phase).toBe("セットアップ中");
    expect(game.zones.手札).toHaveLength(7);

    const result = resetGame(game);
    expect(result.phase).toBe("デッキ読込済");
    expect(result.zones.手札).toHaveLength(0);
    expect(result.deckCards).toHaveLength(60);
  });

  it("相手サイドカウンターが 0 の状態でリセットすると初期値 6 に戻る", () => {
    const { state } = createDeckWith60Cards();
    const game = setupGame(state);
    game.opponentSideCount = 0;

    const result = resetGame(game);
    expect(result.opponentSideCount).toBe(6);
  });

  it("リセット → 再セットアップ → リセットを繰り返しても状態が安定している", () => {
    const { state } = createDeckWith60Cards();

    let current = setupGame(state);
    current = resetGame(current);

    current = setupGame(current);
    current = resetGame(current);

    expect(current.phase).toBe("デッキ読込済");
    expect(current.deckCards).toHaveLength(60);
    expect(current.zones.手札).toHaveLength(0);
    expect(current.zones.山札).toHaveLength(0);
    expect(current.zones.サイド).toHaveLength(0);
    expect(current.zones.バトル場).toHaveLength(0);
    expect(current.zones.ベンチ).toHaveLength(0);
    expect(current.zones.トラッシュ).toHaveLength(0);
    expect(current.zones.スタジアム).toHaveLength(0);
  });
});
