import type { GameState } from "../types/game-state";

export function attachEnergy(
  state: GameState,
  energyInstanceId: string,
  pokemonInstanceId: string,
  fromZone: "手札" | "山札" | "トラッシュ" = "手札",
): GameState {
  const pokemon = state.cardInstances[pokemonInstanceId];
  if (!pokemon || pokemon.card.card_category !== "ポケモン") {
    throw new Error("エネルギーはポケモンにのみ付けられます");
  }

  const zoneCards = state.zones[fromZone].filter((id) => id !== energyInstanceId);

  const updatedInstances = {
    ...state.cardInstances,
    [pokemonInstanceId]: {
      ...pokemon,
      attachedEnergies: [...pokemon.attachedEnergies, energyInstanceId],
    },
  };

  return {
    ...state,
    zones: { ...state.zones, [fromZone]: zoneCards },
    cardInstances: updatedInstances,
  };
}

export function attachTool(
  state: GameState,
  toolInstanceId: string,
  pokemonInstanceId: string,
  fromZone: "手札" | "山札" | "トラッシュ" = "手札",
): GameState {
  const pokemon = state.cardInstances[pokemonInstanceId];
  if (!pokemon || pokemon.card.card_category !== "ポケモン") {
    throw new Error("どうぐはポケモンにのみ付けられます");
  }

  if (pokemon.attachedTool !== null) {
    throw new Error("このポケモンにはすでにどうぐが付いています");
  }

  const zoneCards = state.zones[fromZone].filter((id) => id !== toolInstanceId);

  const updatedInstances = {
    ...state.cardInstances,
    [pokemonInstanceId]: {
      ...pokemon,
      attachedTool: toolInstanceId,
    },
  };

  return {
    ...state,
    zones: { ...state.zones, [fromZone]: zoneCards },
    cardInstances: updatedInstances,
  };
}
