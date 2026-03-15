import { describe, it, expect } from "vitest";
import { adjustOpponentSide } from "../../../src/domain/opponent-side";
import { createInitialGameState } from "../../../src/types/game-state";

describe("FR-32: 相手サイド管理", () => {
  it("通常セットアップでデフォルト6", () => {
    const state = createInitialGameState();
    expect(state.opponentSideCount).toBe(6);
  });

  it("相手サイドカウンターを減らす", () => {
    const state = createInitialGameState();
    const result = adjustOpponentSide(state, -1);
    expect(result.opponentSideCount).toBe(5);
  });

  it("相手サイドカウンターを増やす", () => {
    const state = createInitialGameState();
    state.opponentSideCount = 4;
    const result = adjustOpponentSide(state, 1);
    expect(result.opponentSideCount).toBe(5);
  });

  it("相手サイドカウンターは0未満にならない", () => {
    const state = createInitialGameState();
    state.opponentSideCount = 0;
    const result = adjustOpponentSide(state, -1);
    expect(result.opponentSideCount).toBe(0);
  });

  it("相手サイドカウンターは6を超えない", () => {
    const state = createInitialGameState();
    const result = adjustOpponentSide(state, 1);
    expect(result.opponentSideCount).toBe(6);
  });
});
