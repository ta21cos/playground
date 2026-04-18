import type { GameState } from "../types/game-state";
import type { ZoneName } from "../types/zone";

export function moveCardWithCleanup(
  state: GameState,
  instanceId: string,
  from: ZoneName,
  to: ZoneName,
): GameState {
  const instance = state.cardInstances[instanceId];
  if (!instance) return state;

  if (
    to === "バトル場" &&
    state.zones.バトル場.length > 0 &&
    !state.zones.バトル場.includes(instanceId)
  ) {
    return state;
  }

  const trashIds: string[] = [
    ...instance.attachedEnergies,
    ...(instance.attachedTool ? [instance.attachedTool] : []),
    ...instance.evolutionStack,
  ];

  const zones = { ...state.zones };
  zones[from] = zones[from].filter((id) => id !== instanceId);
  zones[to] = [...zones[to], instanceId];
  zones.トラッシュ = [...zones.トラッシュ, ...trashIds];

  const updatedInstance = {
    ...instance,
    attachedEnergies: [],
    attachedTool: null,
    evolutionStack: [],
    damageCounters: 0,
  };

  return {
    ...state,
    zones,
    cardInstances: { ...state.cardInstances, [instanceId]: updatedInstance },
  };
}

export function detachEnergy(
  state: GameState,
  pokemonInstanceId: string,
  energyInstanceId: string,
  to: ZoneName,
): GameState {
  const pokemon = state.cardInstances[pokemonInstanceId];
  if (!pokemon) return state;

  const updatedEnergies = pokemon.attachedEnergies.filter(
    (id) => id !== energyInstanceId,
  );

  const zones = { ...state.zones };
  if (to === "ベンチ" || to === "バトル場") {
    const targetPokemonId = zones[to].find((id) => id !== pokemonInstanceId);
    if (targetPokemonId) {
      const targetPokemon = state.cardInstances[targetPokemonId];
      if (targetPokemon) {
        return {
          ...state,
          zones,
          cardInstances: {
            ...state.cardInstances,
            [pokemonInstanceId]: {
              ...pokemon,
              attachedEnergies: updatedEnergies,
            },
            [targetPokemonId]: {
              ...targetPokemon,
              attachedEnergies: [
                ...targetPokemon.attachedEnergies,
                energyInstanceId,
              ],
            },
          },
        };
      }
    }
  }

  zones[to] = [...zones[to], energyInstanceId];

  return {
    ...state,
    zones,
    cardInstances: {
      ...state.cardInstances,
      [pokemonInstanceId]: { ...pokemon, attachedEnergies: updatedEnergies },
    },
  };
}

export function detachTool(
  state: GameState,
  pokemonInstanceId: string,
  to: ZoneName,
): GameState {
  const pokemon = state.cardInstances[pokemonInstanceId];
  if (!pokemon || !pokemon.attachedTool) return state;

  const toolId = pokemon.attachedTool;
  const zones = { ...state.zones };
  zones[to] = [...zones[to], toolId];

  return {
    ...state,
    zones,
    cardInstances: {
      ...state.cardInstances,
      [pokemonInstanceId]: { ...pokemon, attachedTool: null },
    },
  };
}

export function detachEnergyToTarget(
  state: GameState,
  fromPokemonId: string,
  energyInstanceId: string,
  toPokemonId: string,
): GameState {
  const fromPokemon = state.cardInstances[fromPokemonId];
  const toPokemon = state.cardInstances[toPokemonId];
  if (!fromPokemon || !toPokemon) return state;

  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [fromPokemonId]: {
        ...fromPokemon,
        attachedEnergies: fromPokemon.attachedEnergies.filter(
          (id) => id !== energyInstanceId,
        ),
      },
      [toPokemonId]: {
        ...toPokemon,
        attachedEnergies: [...toPokemon.attachedEnergies, energyInstanceId],
      },
    },
  };
}
