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
