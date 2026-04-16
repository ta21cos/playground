import type { StateCreator } from "zustand";
import type { Card } from "../types/card";
import type { CardInstance, GameState } from "../types/game-state";
import { createInitialGameState } from "../types/game-state";
import type { ZoneName } from "../types/zone";
import type { DeckCodeResult } from "../domain/deck-code-parser";

import { setupGame } from "../domain/game-setup";
import { executeMulligan } from "../domain/mulligan";
import { startGame, endTurn, type TurnResult } from "../domain/turn";
import {
  moveCard as domainMoveCard,
  setBenchMaxSize,
} from "../domain/zone-actions";
import {
  attachEnergy as domainAttachEnergy,
  attachTool as domainAttachTool,
} from "../domain/attachment";
import { moveCardWithCleanup } from "../domain/attachment-cleanup";
import {
  evolve as domainEvolve,
  devolve as domainDevolve,
} from "../domain/evolution";
import {
  addDamage as domainAddDamage,
  setDamage as domainSetDamage,
} from "../domain/damage-counter";
import { placeStadium as domainPlaceStadium } from "../domain/stadium";
import { adjustOpponentSide } from "../domain/opponent-side";
import { resetGame } from "../domain/reset";
import {
  searchDeck,
  drawCards as domainDrawCards,
  returnToDeckTop as domainReturnToDeckTop,
  returnToDeckBottom as domainReturnToDeckBottom,
  takeSideCard,
  takeSideRandom as domainTakeSideRandom,
  shuffleDeck as domainShuffleDeck,
  returnHandToDeck as domainReturnHandToDeck,
} from "../domain/card-actions";
import { promoteToBattle as domainPromoteToBattle } from "../domain/battle-bench-swap";
import { takeSnapshot, restoreSnapshot } from "./snapshot";

export interface GameStore {
  game: GameState;
  history: GameState[];
  warning: string | null;

  importDeck: (text: string) => void;
  importDeckFromCode: (result: DeckCodeResult) => void;
  setup: () => void;
  mulligan: () => void;
  startGame: () => void;
  endTurn: () => void;
  reset: () => void;

  moveCard: (instanceId: string, from: ZoneName, to: ZoneName) => void;
  moveWithCleanup: (instanceId: string, from: ZoneName, to: ZoneName) => void;
  attachEnergy: (energyId: string, pokemonId: string) => void;
  attachTool: (toolId: string, pokemonId: string) => void;
  evolve: (evolutionId: string, targetId: string) => void;
  devolve: (instanceId: string) => void;
  addDamage: (instanceId: string, amount: number) => void;
  setDamage: (instanceId: string, value: number) => void;
  placeStadium: (instanceId: string) => void;
  promoteToBattle: (instanceId: string) => void;

  drawCards: (n: number) => void;
  searchSelect: (selectedIds: string[]) => void;
  returnToDeckTop: (instanceId: string) => void;
  returnToDeckBottom: (instanceId: string) => void;
  returnHandToDeck: (position: "top" | "bottom") => void;
  shuffleDeck: () => void;

  takeSide: (instanceId: string) => void;
  takeSideRandom: () => void;
  adjustOpponentSide: (delta: number) => void;

  setBenchSize: (size: number) => void;

  undo: () => void;
}

let instanceCounter = 0;

function createInstance(card: Card): CardInstance {
  const id = `inst-${++instanceCounter}`;
  return {
    instanceId: id,
    card,
    attachedEnergies: [],
    attachedTool: null,
    evolutionStack: [],
    damageCounters: 0,
  };
}

function cardsFromText(text: string): Card[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cards: Card[] = [];
  for (const line of lines) {
    const match = /^(.+?)\s+(\d+)$/.exec(line);
    if (!match) continue;
    const [, name, countStr] = match;
    const count = parseInt(countStr!, 10);

    for (let i = 0; i < count; i++) {
      cards.push({
        card_id: name!,
        name: name!,
        card_category: "グッズ",
        image_url: "",
        regulation: "",
        card_number: "",
        rarity: "",
        canonical_id: name!,
        effect_text: "",
        rule_text: "",
      } as Card);
    }
  }
  return cards;
}

function buildDeckInstances(deckCards: Card[]): {
  instances: Record<string, CardInstance>;
  ids: string[];
} {
  instanceCounter = 0;
  const instances: Record<string, CardInstance> = {};
  const ids: string[] = [];

  for (const card of deckCards) {
    const inst = createInstance(card);
    instances[inst.instanceId] = inst;
    ids.push(inst.instanceId);
  }

  return { instances, ids };
}

export const createGameStore: StateCreator<GameStore> = (set, get) => ({
  game: createInitialGameState(),
  history: [],
  warning: null,

  importDeck: (text: string) => {
    const deckCards = cardsFromText(text);
    const { instances, ids } = buildDeckInstances(deckCards);

    set({
      game: {
        ...createInitialGameState(),
        phase: "デッキ読込済",
        zones: {
          ...createInitialGameState().zones,
          山札: ids,
        },
        cardInstances: instances,
        deckCards,
      },
      history: [],
      warning: null,
    });
  },

  importDeckFromCode: (result: DeckCodeResult) => {
    const deckCards: Card[] = [];
    for (const entry of result.entries) {
      for (let i = 0; i < entry.count; i++) {
        deckCards.push({
          card_id: entry.cardId,
          name: entry.name,
          card_category: "ポケモン",
          image_url: entry.imageUrl,
          regulation: "",
          card_number: "",
          rarity: "",
          canonical_id: entry.cardId,
          stage: "たね",
          hp: 70,
          type: [],
          abilities: [],
          moves: [],
          weakness: "",
          resistance: "",
          retreat_cost: 1,
          effect_text: "",
          rule_text: "",
          special_rule: "",
        } as Card);
      }
    }

    const { instances, ids } = buildDeckInstances(deckCards);

    set({
      game: {
        ...createInitialGameState(),
        phase: "デッキ読込済",
        zones: {
          ...createInitialGameState().zones,
          山札: ids,
        },
        cardInstances: instances,
        deckCards,
      },
      history: [],
      warning: null,
    });
  },

  setup: () => {
    const { game } = get();
    const newGame = setupGame(game);
    set({ game: newGame, warning: null });
  },

  mulligan: () => {
    const { game } = get();
    const newGame = executeMulligan(game);
    set({ game: newGame });
  },

  startGame: () => {
    const { game } = get();
    const newGame = startGame(game);
    set({ game: newGame, warning: null });
  },

  endTurn: () => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const result: TurnResult = endTurn(game);
    const { warning: w, ...gameState } = result;
    set({
      game: gameState,
      history: [...history, snapshot],
      warning: w ?? null,
    });
  },

  reset: () => {
    const { game } = get();
    const newGame = resetGame(game);
    set({ game: newGame, history: [], warning: null });
  },

  moveCard: (instanceId: string, from: ZoneName, to: ZoneName) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainMoveCard(game, instanceId, from, to);
    set({ game: newGame, history: [...history, snapshot] });
  },

  moveWithCleanup: (instanceId: string, from: ZoneName, to: ZoneName) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = moveCardWithCleanup(game, instanceId, from, to);
    set({ game: newGame, history: [...history, snapshot] });
  },

  attachEnergy: (energyId: string, pokemonId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainAttachEnergy(game, energyId, pokemonId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  attachTool: (toolId: string, pokemonId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainAttachTool(game, toolId, pokemonId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  evolve: (evolutionId: string, targetId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainEvolve(game, evolutionId, targetId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  devolve: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainDevolve(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  addDamage: (instanceId: string, amount: number) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainAddDamage(game, instanceId, amount);
    set({ game: newGame, history: [...history, snapshot] });
  },

  setDamage: (instanceId: string, value: number) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainSetDamage(game, instanceId, value);
    set({ game: newGame, history: [...history, snapshot] });
  },

  placeStadium: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainPlaceStadium(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  promoteToBattle: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainPromoteToBattle(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  drawCards: (n: number) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const result = domainDrawCards(game, n);
    const { warning: w, ...gameState } = result;
    set({
      game: gameState,
      history: [...history, snapshot],
      warning: w ?? null,
    });
  },

  searchSelect: (selectedIds: string[]) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = searchDeck(game, selectedIds);
    set({ game: newGame, history: [...history, snapshot] });
  },

  returnToDeckTop: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainReturnToDeckTop(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  returnToDeckBottom: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainReturnToDeckBottom(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  returnHandToDeck: (position: "top" | "bottom") => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainReturnHandToDeck(game, position);
    set({ game: newGame, history: [...history, snapshot] });
  },

  shuffleDeck: () => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainShuffleDeck(game);
    set({ game: newGame, history: [...history, snapshot] });
  },

  takeSide: (instanceId: string) => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = takeSideCard(game, instanceId);
    set({ game: newGame, history: [...history, snapshot] });
  },

  takeSideRandom: () => {
    const { game, history } = get();
    const snapshot = takeSnapshot(game);
    const newGame = domainTakeSideRandom(game);
    set({ game: newGame, history: [...history, snapshot] });
  },

  adjustOpponentSide: (delta: number) => {
    const { game } = get();
    const newGame = adjustOpponentSide(game, delta);
    set({ game: newGame });
  },

  setBenchSize: (size: number) => {
    const { game } = get();
    const newGame = setBenchMaxSize(game, size);
    set({ game: newGame });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;

    const previous = history[history.length - 1]!;
    const restored = restoreSnapshot(previous);
    set({
      game: restored,
      history: history.slice(0, -1),
      warning: null,
    });
  },
});
