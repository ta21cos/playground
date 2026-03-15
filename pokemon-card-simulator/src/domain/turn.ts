import type { GameState } from "../types/game-state";

export interface TurnResult extends GameState {
  warning?: string;
}

export function startGame(state: GameState): GameState {
  if (state.zones.バトル場.length === 0) {
    throw new Error("バトル場にたねポケモンを配置してからゲームを開始してください");
  }

  const deck = [...state.zones.山札];
  const side = deck.splice(0, 6);

  const hand = [...state.zones.手札];
  let remaining = deck;
  if (remaining.length > 0) {
    const drawn = remaining[0]!;
    hand.push(drawn);
    remaining = remaining.slice(1);
  }

  return {
    ...state,
    phase: "進行中",
    turnNumber: 1,
    zones: {
      ...state.zones,
      山札: remaining,
      サイド: side,
      手札: hand,
    },
  };
}

export function endTurn(state: GameState): TurnResult {
  const nextTurn = state.turnNumber + 1;

  if (state.zones.山札.length === 0) {
    return {
      ...state,
      turnNumber: nextTurn,
      warning: "山札が0枚のためドローできません",
    };
  }

  const deck = [...state.zones.山札];
  const drawn = deck.shift()!;
  const hand = [...state.zones.手札, drawn];

  return {
    ...state,
    turnNumber: nextTurn,
    zones: {
      ...state.zones,
      山札: deck,
      手札: hand,
    },
  };
}
