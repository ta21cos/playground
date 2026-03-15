import { describe, it, expect, beforeEach } from "vitest";
import { startGame, endTurn } from "../../../src/domain/turn";
import {
  createDeckWith60Cards,
  resetInstanceCounter,
  createPokemonCard,
  createCardInstance,
} from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";
import type { GameState } from "../../../src/types/game-state";

function prepareGameInProgress(): GameState {
  const { state } = createDeckWith60Cards(10);
  const setup = setupGame(state);

  const seedInHand = setup.zones.手札.find((id) => {
    const inst = setup.cardInstances[id];
    return inst?.card.card_category === "ポケモン" && "stage" in inst.card && inst.card.stage === "たね";
  });

  if (seedInHand) {
    setup.zones.手札 = setup.zones.手札.filter((id) => id !== seedInHand);
    setup.zones.バトル場 = [seedInHand];
  } else {
    const pokemon = createPokemonCard({ name: "強制たね", card_id: "forced-seed", canonical_id: "forced-seed" });
    const inst = createCardInstance(pokemon);
    setup.cardInstances[inst.instanceId] = inst;
    setup.zones.バトル場 = [inst.instanceId];
  }

  return startGame(setup);
}

describe("FR-7: ゲーム開始", () => {
  beforeEach(() => resetInstanceCounter());

  it("バトル場にたねポケモンを配置してゲーム開始 → サイド6枚、進行中、ターン1ドロー", () => {
    const game = prepareGameInProgress();

    expect(game.phase).toBe("進行中");
    expect(game.zones.サイド).toHaveLength(6);
    expect(game.turnNumber).toBe(1);
  });

  it("バトル場にカードがないとゲームを開始できない", () => {
    const { state } = createDeckWith60Cards();
    const setup = setupGame(state);
    setup.zones.バトル場 = [];

    expect(() => startGame(setup)).toThrow();
  });
});

describe("FR-8: ターン開始ドロー（自動）", () => {
  beforeEach(() => resetInstanceCounter());

  it("ターン終了時に次ターンのドローが自動で行われる", () => {
    const game = prepareGameInProgress();
    const handBefore = game.zones.手札.length;
    const deckBefore = game.zones.山札.length;

    const result = endTurn(game);
    expect(result.zones.手札).toHaveLength(handBefore + 1);
    expect(result.zones.山札).toHaveLength(deckBefore - 1);
  });

  it("山札が0枚の場合ターン終了で警告が含まれる", () => {
    const game = prepareGameInProgress();
    game.zones.山札 = [];

    const result = endTurn(game);
    expect(result.warning).toBeDefined();
    expect(result.turnNumber).toBe(game.turnNumber + 1);
  });
});

describe("FR-9: ターン数表示", () => {
  beforeEach(() => resetInstanceCounter());

  it("ゲーム開始時のターン数は 1", () => {
    const game = prepareGameInProgress();
    expect(game.turnNumber).toBe(1);
  });

  it("ターン終了ごとにターン数が増加する", () => {
    const game = prepareGameInProgress();
    game.turnNumber = 3;
    const result = endTurn(game);
    expect(result.turnNumber).toBe(4);
  });
});

describe("FR-10: ターン終了", () => {
  beforeEach(() => resetInstanceCounter());

  it("ターン終了でターン数をインクリメントしドローが自動で行われる", () => {
    const game = prepareGameInProgress();
    const turnBefore = game.turnNumber;
    const result = endTurn(game);
    expect(result.turnNumber).toBe(turnBefore + 1);
  });
});
