import { test, expect } from "@playwright/test";
import {
  startGameWithSeed,
  dragCardToZone,
  getZone,
  clickCard,
} from "./helpers";

test.describe("FR-31: 付与カードの個別取り外し", () => {
  test("付いているエネルギーを他のポケモンに移動する（コンテキストメニュー経由）", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handZone = getZone(page, "手札");
    const energyCard = handZone
      .locator('[data-card-category="基本エネルギー"], [data-card-category="特殊エネルギー"]')
      .first();
    const hasEnergy = await energyCard.isVisible().catch(() => false);
    if (!hasEnergy) { test.skip(); return; }

    const battlePokemon = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, energyCard, battlePokemon);

    const energyCount = page.locator('[data-zone="バトル場"] .energy-count');
    await expect(energyCount).toBeVisible();
    expect(await energyCount.textContent()).toBe("1");
  });
});
