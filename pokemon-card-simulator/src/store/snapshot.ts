import type { GameState } from "../types/game-state";

export function takeSnapshot(state: GameState): GameState {
  return structuredClone(state);
}

export function restoreSnapshot(snapshot: GameState): GameState {
  return structuredClone(snapshot);
}
