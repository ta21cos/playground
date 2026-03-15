import type { ZoneName } from "./zone";
import type { Card } from "./card";

export type GamePhase = "デッキ未読込" | "デッキ読込済" | "セットアップ中" | "進行中";

export interface CardInstance {
  instanceId: string;
  card: Card;
  attachedEnergies: string[];
  attachedTool: string | null;
  evolutionStack: string[];
  damageCounters: number;
}

export interface GameState {
  phase: GamePhase;
  turnNumber: number;
  zones: Record<ZoneName, string[]>;
  cardInstances: Record<string, CardInstance>;
  benchMaxSize: number;
  opponentSideCount: number;
  deckCards: Card[];
}

export function createInitialGameState(): GameState {
  return {
    phase: "デッキ未読込",
    turnNumber: 0,
    zones: {
      山札: [],
      手札: [],
      サイド: [],
      バトル場: [],
      ベンチ: [],
      トラッシュ: [],
      スタジアム: [],
    },
    cardInstances: {},
    benchMaxSize: 5,
    opponentSideCount: 6,
    deckCards: [],
  };
}
