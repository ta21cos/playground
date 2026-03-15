import type { Card } from "../types/card";

export class CardResolver {
  private byCanonicalId: Map<string, Card>;
  private byName: Map<string, Card>;

  constructor(cards: Card[]) {
    this.byCanonicalId = new Map();
    this.byName = new Map();

    for (const card of cards) {
      if (!this.byCanonicalId.has(card.canonical_id)) {
        this.byCanonicalId.set(card.canonical_id, card);
      }
      if (!this.byName.has(card.name)) {
        this.byName.set(card.name, card);
      }
    }
  }

  findByName(name: string): Card[] {
    const card = this.byName.get(name);
    return card ? [card] : [];
  }

  resolveInstances(name: string, count: number): Card[] {
    const card = this.byName.get(name);
    if (!card) {
      throw new Error(`カード "${name}" が見つかりません`);
    }
    return Array.from({ length: count }, () => ({ ...card }));
  }
}
