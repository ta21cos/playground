import type { GameState, CardInstance } from "../types/game-state";
import type { Card } from "../types/card";
import { shuffle } from "./game-setup";

let customCounter = 0;

function createInstance(card: Card): CardInstance {
  const id = `custom-${++customCounter}`;
  return {
    instanceId: id,
    card,
    attachedEnergies: [],
    attachedTool: null,
    evolutionStack: [],
    damageCounters: 0,
  };
}

export interface CustomSetupConfig {
  hand: Card[];
  battleField: Card | null;
  bench: Card[];
  opponentSideCount?: number;
}

export function customSetup(
  state: GameState,
  config: CustomSetupConfig,
): GameState {
  customCounter = 0;
  const allCards = state.deckCards;

  const usedCards: Card[] = [
    ...config.hand,
    ...(config.battleField ? [config.battleField] : []),
    ...config.bench,
  ];

  if (config.battleField && config.bench.length > 0) {
    // check battle field limit
  }

  const instances: Record<string, CardInstance> = {};
  const handIds: string[] = [];
  const battleIds: string[] = [];
  const benchIds: string[] = [];

  for (const card of config.hand) {
    const inst = createInstance(card);
    instances[inst.instanceId] = inst;
    handIds.push(inst.instanceId);
  }

  if (config.battleField) {
    const inst = createInstance(config.battleField);
    instances[inst.instanceId] = inst;
    battleIds.push(inst.instanceId);
  }

  for (const card of config.bench) {
    const inst = createInstance(card);
    instances[inst.instanceId] = inst;
    benchIds.push(inst.instanceId);
  }

  const remainingCards = [...allCards];
  for (const used of usedCards) {
    const idx = remainingCards.findIndex((c) => c.card_id === used.card_id);
    if (idx >= 0) remainingCards.splice(idx, 1);
  }

  const shuffled = shuffle(remainingCards);
  const sideCards = shuffled.slice(0, 6);
  const deckCards = shuffled.slice(6);

  const sideIds: string[] = [];
  for (const card of sideCards) {
    const inst = createInstance(card);
    instances[inst.instanceId] = inst;
    sideIds.push(inst.instanceId);
  }

  const deckIds: string[] = [];
  for (const card of deckCards) {
    const inst = createInstance(card);
    instances[inst.instanceId] = inst;
    deckIds.push(inst.instanceId);
  }

  // Turn 1 draw
  const drawnId = deckIds.shift();
  if (drawnId) {
    handIds.push(drawnId);
  }

  return {
    ...state,
    phase: "進行中",
    turnNumber: 1,
    zones: {
      山札: deckIds,
      手札: handIds,
      サイド: sideIds,
      バトル場: battleIds,
      ベンチ: benchIds,
      トラッシュ: [],
      スタジアム: [],
    },
    cardInstances: instances,
    opponentSideCount: config.opponentSideCount ?? 6,
  };
}
