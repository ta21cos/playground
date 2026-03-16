import { describe, it, expect, beforeEach } from "vitest";
import { setupGame } from "../../../src/domain/game-setup";
import {
  createDeckWith60Cards,
  resetInstanceCounter,
} from "../../helpers/deck-factory";

describe("FR-5: 初期配布", () => {
  beforeEach(() => resetInstanceCounter());

  it("デッキをシャッフルして手札7枚を配り、サイドはまだ配らない", () => {
    const { state } = createDeckWith60Cards();
    const result = setupGame(state);

    expect(result.zones.手札).toHaveLength(7);
    expect(result.zones.山札).toHaveLength(53);
    expect(result.zones.サイド).toHaveLength(0);
    expect(result.phase).toBe("セットアップ中");
  });
});

describe("@edge-case FR-5: セットアップのエッジケース", () => {
  beforeEach(() => resetInstanceCounter());

  it("山札が 7 枚未満の場合、全枚数を手札に配り山札は 0 枚になる", () => {
    const { state } = createDeckWith60Cards();
    state.zones.山札 = state.zones.山札.slice(0, 3);

    const result = setupGame(state);
    expect(result.zones.手札).toHaveLength(3);
    expect(result.zones.山札).toHaveLength(0);
  });
});
