import type { GameState } from "../types/game-state";

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export { shuffle };

export function setupGame(state: GameState): GameState {
  const deck = shuffle(state.zones.山札);
  const hand = deck.slice(0, 7);
  const remaining = deck.slice(7);

  return {
    ...state,
    phase: "セットアップ中",
    zones: {
      ...state.zones,
      山札: remaining,
      手札: hand,
      サイド: [],
    },
  };
}
