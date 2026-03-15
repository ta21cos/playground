import type { GameState } from "../types/game-state";

export function adjustOpponentSide(
  state: GameState,
  delta: number,
): GameState {
  const newCount = state.opponentSideCount + delta;
  if (newCount < 0 || newCount > 6) return state;
  return { ...state, opponentSideCount: newCount };
}

export function setOpponentSide(
  state: GameState,
  value: number,
): GameState {
  if (value < 0 || value > 6) return state;
  return { ...state, opponentSideCount: value };
}
