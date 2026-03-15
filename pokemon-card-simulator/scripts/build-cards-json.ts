import type { Card } from "../src/types/card";

export interface RawCardData {
  card_id: string;
  name: string;
  card_category: string;
  image_url: string;
  regulation: string;
  card_number: string;
  rarity: string;
  canonical_id: string;
  stage?: string;
  hp?: number | null;
  type?: string[];
  abilities?: Array<{ name: string; description: string }>;
  moves?: Array<{
    name: string;
    energy_cost: string[];
    damage: string;
    description: string;
  }>;
  weakness?: string;
  resistance?: string;
  retreat_cost?: number;
  effect_text?: string;
  rule_text?: string;
  special_rule?: string;
  illustrator?: string;
  flavor_text?: string;
  pokedex_info?: string;
  evolutions?: unknown[];
  packs?: unknown[];
}

const BASE_FIELDS = [
  "card_id",
  "name",
  "card_category",
  "image_url",
  "regulation",
  "card_number",
  "rarity",
  "canonical_id",
] as const;

const POKEMON_FIELDS = [
  "stage",
  "hp",
  "type",
  "abilities",
  "moves",
  "weakness",
  "resistance",
  "retreat_cost",
  "effect_text",
  "rule_text",
  "special_rule",
] as const;

const TRAINER_FIELDS = ["effect_text", "rule_text", "special_rule"] as const;

function pickFields(
  raw: RawCardData,
  fields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in raw) {
      result[field] = raw[field as keyof RawCardData];
    }
  }
  return result;
}

export function buildCardsJson(rawCards: RawCardData[]): Card[] {
  return rawCards.map((raw) => {
    const base = pickFields(raw, BASE_FIELDS);

    if (raw.card_category === "ポケモン") {
      return { ...base, ...pickFields(raw, POKEMON_FIELDS) } as unknown as Card;
    }

    if (
      raw.card_category === "グッズ" ||
      raw.card_category === "サポート" ||
      raw.card_category === "スタジアム" ||
      raw.card_category === "ポケモンのどうぐ" ||
      raw.card_category === "特殊エネルギー"
    ) {
      return {
        ...base,
        ...pickFields(raw, TRAINER_FIELDS),
      } as unknown as Card;
    }

    return base as unknown as Card;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { Database } = await import("bun:sqlite");
  const path = await import("path");
  const fs = await import("fs");

  const dbPath = path.resolve(
    import.meta.dir,
    "../../pokemon-card-scraper/cards.db",
  );
  const db = new Database(dbPath, { readonly: true });
  const rows = db.query("SELECT data FROM cards").all() as Array<{
    data: string;
  }>;
  const rawCards: RawCardData[] = rows.map((r) => JSON.parse(r.data));
  const cards = buildCardsJson(rawCards);

  const outPath = path.resolve(import.meta.dir, "../src/data/cards.json");
  fs.writeFileSync(outPath, JSON.stringify(cards));
  console.log(`Generated ${cards.length} cards → ${outPath}`);
  db.close();
}
