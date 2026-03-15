import type { Card } from "./card";

export interface DeckEntry {
  card: Card;
  count: number;
}

export interface DeckList {
  entries: DeckEntry[];
  totalCount: number;
}

export interface DeckJson {
  version: 1;
  entries: Array<{ name: string; count: number }>;
}
