import type { GameState } from "../types/game-state";
import { shuffle } from "./game-setup";

export function searchDeck(state: GameState, selectedIds: string[]): GameState {
  const remaining = state.zones.山札.filter((id) => !selectedIds.includes(id));
  const hand = [...state.zones.手札, ...selectedIds];

  return {
    ...state,
    zones: {
      ...state.zones,
      山札: shuffle(remaining),
      手札: hand,
    },
  };
}

export interface DrawResult extends GameState {
  warning?: string;
}

export function drawCards(state: GameState, n: number): DrawResult {
  if (n <= 0) {
    throw new Error("ドロー枚数は1以上を指定してください");
  }

  const deck = [...state.zones.山札];
  const hand = [...state.zones.手札];
  let warning: string | undefined;

  if (deck.length < n) {
    warning = `山札の残りが${deck.length}枚のため、${deck.length}枚のみドローしました`;
    hand.push(...deck);
    return {
      ...state,
      zones: { ...state.zones, 山札: [], 手札: hand },
      warning,
    };
  }

  const drawn = deck.splice(0, n);
  hand.push(...drawn);

  return {
    ...state,
    zones: { ...state.zones, 山札: deck, 手札: hand },
  };
}

export function returnToDeckTop(
  state: GameState,
  instanceId: string,
): GameState {
  const hand = state.zones.手札.filter((id) => id !== instanceId);
  const deck = [instanceId, ...state.zones.山札];

  return {
    ...state,
    zones: { ...state.zones, 手札: hand, 山札: deck },
  };
}

export function returnToDeckBottom(
  state: GameState,
  instanceId: string,
): GameState {
  const hand = state.zones.手札.filter((id) => id !== instanceId);
  const deck = [...state.zones.山札, instanceId];

  return {
    ...state,
    zones: { ...state.zones, 手札: hand, 山札: deck },
  };
}

export function viewSide(state: GameState): string[] {
  return [...state.zones.サイド];
}

export function takeSideCard(state: GameState, instanceId: string): GameState {
  const side = state.zones.サイド.filter((id) => id !== instanceId);
  const hand = [...state.zones.手札, instanceId];

  return {
    ...state,
    zones: { ...state.zones, サイド: side, 手札: hand },
  };
}

export function takeSideRandom(state: GameState): GameState {
  if (state.zones.サイド.length === 0) return state;

  const idx = Math.floor(Math.random() * state.zones.サイド.length);
  const picked = state.zones.サイド[idx]!;
  return takeSideCard(state, picked);
}

export function shuffleDeck(state: GameState): GameState {
  return {
    ...state,
    zones: { ...state.zones, 山札: shuffle(state.zones.山札) },
  };
}

export function returnHandToDeck(
  state: GameState,
  position: "top" | "bottom",
): GameState {
  const hand = [...state.zones.手札];
  if (hand.length === 0) return state;

  const deck =
    position === "top"
      ? [...hand, ...state.zones.山札]
      : [...state.zones.山札, ...hand];

  return {
    ...state,
    zones: { ...state.zones, 手札: [], 山札: deck },
  };
}
