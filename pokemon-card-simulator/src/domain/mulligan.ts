import type { GameState } from "../types/game-state";
import { shuffle } from "./game-setup";

export function needsMulligan(state: GameState): boolean {
  return !state.zones.手札.some((id) => {
    const instance = state.cardInstances[id];
    return (
      instance?.card.card_category === "ポケモン" &&
      "stage" in instance.card &&
      instance.card.stage === "たね"
    );
  });
}

export function executeMulligan(state: GameState): GameState {
  const deck = shuffle([...state.zones.山札, ...state.zones.手札]);
  const hand = deck.slice(0, 7);
  const remaining = deck.slice(7);

  return {
    ...state,
    zones: {
      ...state.zones,
      山札: remaining,
      手札: hand,
    },
  };
}
