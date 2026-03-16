import type { GameState } from "../types/game-state";

export function moveToBench(
  state: GameState,
  instanceId: string,
): GameState {
  if (state.zones.ベンチ.length >= state.benchMaxSize) {
    throw new Error("ベンチが満杯のため移動できません");
  }

  const battle = state.zones.バトル場.filter((id) => id !== instanceId);
  const bench = [...state.zones.ベンチ, instanceId];

  return {
    ...state,
    zones: { ...state.zones, バトル場: battle, ベンチ: bench },
  };
}

export function promoteToBattle(
  state: GameState,
  instanceId: string,
): GameState {
  const bench = state.zones.ベンチ.filter((id) => id !== instanceId);
  const battle = [instanceId];

  return {
    ...state,
    zones: { ...state.zones, バトル場: battle, ベンチ: bench },
  };
}

export function needsBenchSelector(state: GameState): boolean {
  return state.zones.バトル場.length === 0 && state.zones.ベンチ.length > 0;
}
