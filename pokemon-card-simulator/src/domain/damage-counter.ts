import type { GameState } from "../types/game-state";

export function addDamage(
  state: GameState,
  instanceId: string,
  amount: number,
): GameState {
  const instance = state.cardInstances[instanceId];
  if (!instance) return state;

  const newDamage = Math.max(0, instance.damageCounters + amount);

  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [instanceId]: { ...instance, damageCounters: newDamage },
    },
  };
}

export function setDamage(
  state: GameState,
  instanceId: string,
  value: number,
): GameState {
  const instance = state.cardInstances[instanceId];
  if (!instance) return state;

  const sanitized = Number.isFinite(value) ? value : 0;

  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [instanceId]: { ...instance, damageCounters: Math.max(0, sanitized) },
    },
  };
}
