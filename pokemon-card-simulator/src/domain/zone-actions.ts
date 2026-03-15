import type { GameState } from "../types/game-state";
import type { ZoneName } from "../types/zone";

export function moveCard(
  state: GameState,
  instanceId: string,
  from: ZoneName,
  to: ZoneName,
): GameState {
  const fromZone = state.zones[from].filter((id) => id !== instanceId);
  const toZone = [...state.zones[to], instanceId];

  return {
    ...state,
    zones: {
      ...state.zones,
      [from]: fromZone,
      [to]: toZone,
    },
  };
}

export function setBenchMaxSize(
  state: GameState,
  newSize: number,
): GameState {
  if (newSize < 5 || newSize > 8) {
    return state;
  }
  if (newSize < state.zones.ベンチ.length) {
    return state;
  }
  return { ...state, benchMaxSize: newSize };
}
