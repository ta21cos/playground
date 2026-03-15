import type { GameState } from "../types/game-state";
import { createInitialGameState } from "../types/game-state";

export function resetGame(state: GameState): GameState {
  const initial = createInitialGameState();
  return {
    ...initial,
    phase: "デッキ読込済",
    deckCards: state.deckCards,
  };
}
