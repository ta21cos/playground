import { type Page, type Locator, expect } from "@playwright/test";

const TEST_DECK = `ストライク 4
クヌギダマ 4
タネボー 4
キノココ 4
シキジカ 4
ハンドトリマー 4
プライムキャッチャー 4
リブートポッド 4
暗号マニアの解読 4
セイジ 4
ミストエネルギー 20`;

export async function importDeck(page: Page, deck = TEST_DECK) {
  const textTab = page.getByRole("button", { name: "テキスト入力" });
  if (await textTab.isVisible().catch(() => false)) {
    await textTab.click();
  }
  await page.getByRole("textbox").fill(deck);
  await page.getByRole("button", { name: "デッキ読み込み" }).click();
  await expect(page.getByText("デッキ読込完了: 60枚")).toBeVisible();
}

export async function setupNormalGame(page: Page) {
  await importDeck(page);
  await page.getByRole("button", { name: "通常セットアップ" }).click();
  await expect(getZoneCount(page, "手札")).toHaveText("7");
}

export async function startGameWithSeed(page: Page) {
  await setupNormalGame(page);
  await ensureSeedInBattle(page);

  const startBtn = page.getByRole("button", { name: "ゲーム開始" });
  await expect(startBtn).toBeVisible({ timeout: 5000 });
  await startBtn.click();
  await expect(page.getByText(/ターン 1/)).toBeVisible({ timeout: 5000 });
}

async function ensureSeedInBattle(page: Page) {
  const battleZone = getZone(page, "バトル場");

  for (let attempt = 0; attempt < 10; attempt++) {
    const battleCount = await getZoneCount(page, "バトル場").textContent();
    if (battleCount && parseInt(battleCount) > 0) return;

    const mulliganBtn = page.getByRole("button", { name: "マリガン" });
    const isMulligan = await mulliganBtn.isVisible().catch(() => false);
    if (isMulligan) {
      await mulliganBtn.click();
      await page.waitForTimeout(300);
      continue;
    }

    const seedNames = [
      "ストライク",
      "クヌギダマ",
      "タネボー",
      "キノココ",
      "シキジカ",
    ];
    let placed = false;
    for (const name of seedNames) {
      const handZone = getZone(page, "手札");
      const card = handZone.getByRole("button", { name }).first();
      const visible = await card.isVisible().catch(() => false);
      if (visible) {
        await dragCardToZone(page, card, battleZone);
        await page.waitForTimeout(300);
        const afterCount = await getZoneCount(page, "バトル場").textContent();
        if (afterCount && parseInt(afterCount) > 0) {
          placed = true;
          break;
        }
      }
    }
    if (placed) break;
  }
}

export async function dragCardToZone(
  page: Page,
  card: Locator,
  targetZone: Locator,
) {
  const cardBox = await card.boundingBox();
  const zoneBox = await targetZone.boundingBox();
  if (!cardBox || !zoneBox) throw new Error("Element not found for DnD");

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = zoneBox.x + zoneBox.width / 2;
  const endY = zoneBox.y + zoneBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // activationConstraint.distance(8px) を確実に超える初期移動
  await page.mouse.move(startX + 10, startY, { steps: 3 });
  await page.waitForTimeout(50);

  // ターゲットへ移動
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(50);

  // ドロップ
  await page.mouse.move(endX, endY);
  await page.mouse.up();
  await page.waitForTimeout(200);
}

export function getZone(page: Page, zoneName: string) {
  return page.locator(`[data-zone="${zoneName}"]`);
}

export function getZoneCount(page: Page, zoneName: string) {
  return page.locator(`[data-zone="${zoneName}"] .zone-count`);
}

export function getCardInZone(page: Page, zoneName: string, cardName?: string) {
  const zone = getZone(page, zoneName);
  if (cardName) {
    return zone.locator(`[data-card-name="${cardName}"]`).first();
  }
  return zone.locator("[data-card-id]").first();
}

export async function clickCard(
  page: Page,
  zoneName: string,
  cardName?: string,
) {
  const card = getCardInZone(page, zoneName, cardName);
  await card.click({ force: true });
  await page.waitForTimeout(200);
}
