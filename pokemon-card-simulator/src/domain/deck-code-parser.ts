export interface DeckCodeEntry {
  cardId: string;
  name: string;
  imageUrl: string;
  count: number;
}

export interface DeckCodeResult {
  entries: DeckCodeEntry[];
  totalCount: number;
  deckCode: string;
}

const DECK_CODE_PATTERN = /^[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6}$/;
const DECK_URL_BASE =
  "https://www.pokemon-card.com/deck/confirm.html/deckID/";

export function isValidDeckCode(code: string): boolean {
  return DECK_CODE_PATTERN.test(code.trim());
}

function parseDeckField(value: string): Array<{ cardId: string; count: number }> {
  if (!value) return [];
  return value.split("-").map((entry) => {
    const parts = entry.split("_");
    return {
      cardId: parts[0]!,
      count: parseInt(parts[1] ?? "1", 10),
    };
  });
}

export async function fetchDeckFromCode(
  deckCode: string,
): Promise<DeckCodeResult> {
  const code = deckCode.trim();
  if (!isValidDeckCode(code)) {
    throw new Error("無効なデッキコード形式です");
  }

  const url = `${DECK_URL_BASE}${code}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`デッキコードの読み込みに失敗しました (${response.status})`);
  }

  const html = await response.text();
  return parseDeckHtml(html, code);
}

function parseDeckHtml(html: string, deckCode: string): DeckCodeResult {
  const names: Record<string, string> = {};
  const images: Record<string, string> = {};

  const nameRegex = /PCGDECK\.searchItemNameAlt\[(\d+)\]='([^']+)'/g;
  let match;
  while ((match = nameRegex.exec(html)) !== null) {
    names[match[1]!] = match[2]!;
  }

  const imgRegex = /PCGDECK\.searchItemCardPict\[(\d+)\]='([^']+)'/g;
  while ((match = imgRegex.exec(html)) !== null) {
    images[match[1]!] = `https://www.pokemon-card.com${match[2]!}`;
  }

  const deckFields = [
    "deck_pke",
    "deck_gds",
    "deck_tool",
    "deck_sup",
    "deck_sta",
    "deck_ene",
  ];

  const entries: DeckCodeEntry[] = [];
  let totalCount = 0;

  for (const fieldName of deckFields) {
    const fieldRegex = new RegExp(
      `name="${fieldName}"[^>]*value="([^"]*)"`,
    );
    const fieldMatch = fieldRegex.exec(html);
    if (!fieldMatch || !fieldMatch[1]) continue;

    const cards = parseDeckField(fieldMatch[1]);
    for (const card of cards) {
      entries.push({
        cardId: card.cardId,
        name: names[card.cardId] ?? `Unknown (${card.cardId})`,
        imageUrl: images[card.cardId] ?? "",
        count: card.count,
      });
      totalCount += card.count;
    }
  }

  if (entries.length === 0) {
    throw new Error("デッキコードからカード情報を取得できませんでした");
  }

  return { entries, totalCount, deckCode };
}
