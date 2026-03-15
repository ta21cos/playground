import type { GameState } from "../types/game-state";

export function evolve(
  state: GameState,
  evolutionInstanceId: string,
  targetInstanceId: string,
  fromZone: "手札" = "手札",
): GameState {
  const target = state.cardInstances[targetInstanceId];
  const evolution = state.cardInstances[evolutionInstanceId];
  if (!target || !evolution) throw new Error("カードが見つかりません");

  const updatedEvolution = {
    ...evolution,
    attachedEnergies: [...target.attachedEnergies],
    attachedTool: target.attachedTool,
    evolutionStack: [...target.evolutionStack, targetInstanceId],
    damageCounters: target.damageCounters,
  };

  const zones = { ...state.zones };
  zones[fromZone] = zones[fromZone].filter((id) => id !== evolutionInstanceId);

  for (const zoneName of Object.keys(zones) as Array<keyof typeof zones>) {
    zones[zoneName] = zones[zoneName].map((id) =>
      id === targetInstanceId ? evolutionInstanceId : id,
    );
  }

  return {
    ...state,
    zones,
    cardInstances: {
      ...state.cardInstances,
      [evolutionInstanceId]: updatedEvolution,
      [targetInstanceId]: { ...target, attachedEnergies: [], attachedTool: null, evolutionStack: [], damageCounters: 0 },
    },
  };
}

export function devolve(
  state: GameState,
  instanceId: string,
): GameState {
  const instance = state.cardInstances[instanceId];
  if (!instance || instance.evolutionStack.length === 0) {
    throw new Error("退化できません");
  }

  const previousId = instance.evolutionStack[instance.evolutionStack.length - 1]!;
  const previousInstance = state.cardInstances[previousId];
  if (!previousInstance) throw new Error("進化元が見つかりません");

  const restoredPrevious = {
    ...previousInstance,
    attachedEnergies: [...instance.attachedEnergies],
    attachedTool: instance.attachedTool,
    evolutionStack: instance.evolutionStack.slice(0, -1),
    damageCounters: instance.damageCounters,
  };

  const zones = { ...state.zones };
  for (const zoneName of Object.keys(zones) as Array<keyof typeof zones>) {
    zones[zoneName] = zones[zoneName].map((id) =>
      id === instanceId ? previousId : id,
    );
  }
  zones.手札 = [...zones.手札, instanceId];

  return {
    ...state,
    zones,
    cardInstances: {
      ...state.cardInstances,
      [previousId]: restoredPrevious,
      [instanceId]: { ...instance, attachedEnergies: [], attachedTool: null, evolutionStack: [], damageCounters: 0 },
    },
  };
}
