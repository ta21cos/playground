import type { Card, PokemonCard } from "../../src/types/card";
import type { CardInstance, GameState } from "../../src/types/game-state";
import { createInitialGameState } from "../../src/types/game-state";

let instanceCounter = 0;

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

export function createPokemonCard(
  overrides: Partial<PokemonCard> = {},
): PokemonCard {
  return {
    card_id: `pokemon-${instanceCounter}`,
    name: "テストポケモン",
    card_category: "ポケモン",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: `pokemon-${instanceCounter}`,
    stage: "たね",
    hp: 100,
    type: ["草"],
    abilities: [],
    moves: [],
    weakness: "",
    resistance: "",
    retreat_cost: 1,
    effect_text: "",
    rule_text: "",
    special_rule: "",
    ...overrides,
  };
}

export function createItemCard(name = "テストグッズ"): Card {
  return {
    card_id: `item-${instanceCounter}`,
    name,
    card_category: "グッズ",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: `item-${instanceCounter}`,
    effect_text: "",
    rule_text: "",
  };
}

export function createCardInstance(card: Card): CardInstance {
  const id = `instance-${++instanceCounter}`;
  return {
    instanceId: id,
    card,
    attachedEnergies: [],
    attachedTool: null,
    evolutionStack: [],
    damageCounters: 0,
  };
}

export function createDeckWith60Cards(seedCount = 4): {
  state: GameState;
  cards: Card[];
} {
  const state = createInitialGameState();
  const cards: Card[] = [];
  resetInstanceCounter();

  for (let i = 0; i < seedCount; i++) {
    const card = createPokemonCard({ name: `たねポケモン${i}`, card_id: `seed-${i}`, canonical_id: `seed-${i}` });
    cards.push(card);
  }
  for (let i = 0; i < 60 - seedCount; i++) {
    const card = createItemCard(`グッズ${i}`);
    (card as { card_id: string }).card_id = `item-${i}`;
    (card as { canonical_id: string }).canonical_id = `item-${i}`;
    cards.push(card);
  }

  for (const card of cards) {
    const instance = createCardInstance(card);
    state.cardInstances[instance.instanceId] = instance;
    state.zones.山札.push(instance.instanceId);
  }

  state.deckCards = cards;
  state.phase = "デッキ読込済";

  return { state, cards };
}

export function createDeckWithoutSeeds(): {
  state: GameState;
  cards: Card[];
} {
  return createDeckWith60Cards(0);
}
