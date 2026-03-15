import { test, expect } from "@playwright/test";
import {
  startGameWithSeed,
  dragCardToZone,
  getZone,
  getCardInZone,
} from "./helpers";

test.describe("FR-17: エネルギー付与（DnD）", () => {
  test("手札のエネルギーをポケモンにドラッグ&ドロップで付ける", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const energyCard = getZone(page, "手札")
      .locator('[data-card-category="基本エネルギー"], [data-card-category="特殊エネルギー"]')
      .first();

    const hasEnergy = await energyCard.isVisible().catch(() => false);
    if (!hasEnergy) {
      test.skip();
      return;
    }

    const battlePokemon = getZone(page, "バトル場")
      .locator('[data-card-category="ポケモン"]')
      .first();

    await dragCardToZone(page, energyCard, battlePokemon);

    const energyCount = page.locator(
      '[data-zone="バトル場"] .energy-count',
    );
    await expect(energyCount).toBeVisible();
  });

  test("ベンチのポケモンにもエネルギーを付けられる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const seedNames = ["ストライク", "クヌギダマ", "タネボー", "キノココ", "シキジカ"];
    const handZone = getZone(page, "手札");
    const benchZone = getZone(page, "ベンチ");

    for (const name of seedNames) {
      const card = handZone.locator(`[data-card-name="${name}"]`).first();
      if (await card.isVisible().catch(() => false)) {
        await dragCardToZone(page, card, benchZone);
        break;
      }
    }

    const benchPokemon = benchZone.locator('[data-card-category="ポケモン"]').first();
    const hasBenchPokemon = await benchPokemon.isVisible().catch(() => false);
    if (!hasBenchPokemon) {
      test.skip();
      return;
    }

    const energyCard = handZone
      .locator('[data-card-category="基本エネルギー"], [data-card-category="特殊エネルギー"]')
      .first();
    const hasEnergy = await energyCard.isVisible().catch(() => false);
    if (!hasEnergy) {
      test.skip();
      return;
    }

    await dragCardToZone(page, energyCard, benchPokemon);

    const energyCount = benchZone.locator(".energy-count");
    await expect(energyCount).toBeVisible();
  });
});
