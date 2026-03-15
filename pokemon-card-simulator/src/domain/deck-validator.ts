import type { Card } from "../types/card";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDeck(cards: Card[]): ValidationResult {
  if (cards.length !== 60) {
    return {
      valid: false,
      error: `デッキは60枚で構成する必要があります（現在: ${cards.length}枚）`,
    };
  }
  return { valid: true };
}
