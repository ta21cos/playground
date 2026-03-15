import { test, expect } from "@playwright/test";
import {
  startGameWithSeed,
  dragCardToZone,
  getZone,
} from "./helpers";

test.describe("FR-29: ポケモンのどうぐ付与（DnD）", () => {
  test("どうぐカードをポケモンにドラッグ&ドロップで付ける", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handZone = getZone(page, "手札");
    const toolCard = handZone.locator('[data-card-category="ポケモンのどうぐ"]').first();
    const hasTool = await toolCard.isVisible().catch(() => false);
    if (!hasTool) {
      test.skip();
      return;
    }

    const battlePokemon = getZone(page, "バトル場")
      .locator('[data-card-category="ポケモン"]')
      .first();
    await dragCardToZone(page, toolCard, battlePokemon);

    const toolIndicator = page.locator('[data-zone="バトル場"] .tool-indicator');
    await expect(toolIndicator).toBeVisible();
  });

  test("ベンチのポケモンにもどうぐを付けられる", async ({ page }) => {
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
    const hasBench = await benchPokemon.isVisible().catch(() => false);
    if (!hasBench) { test.skip(); return; }

    const toolCard = handZone.locator('[data-card-category="ポケモンのどうぐ"]').first();
    const hasTool = await toolCard.isVisible().catch(() => false);
    if (!hasTool) { test.skip(); return; }

    await dragCardToZone(page, toolCard, benchPokemon);
    const toolIndicator = benchZone.locator(".tool-indicator");
    await expect(toolIndicator).toBeVisible();
  });
});
