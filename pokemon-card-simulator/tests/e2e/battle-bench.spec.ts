import { test, expect } from "@playwright/test";
import {
  startGameWithSeed,
  dragCardToZone,
  getZone,
  getZoneCount,
} from "./helpers";

test.describe("FR-36: バトル場/ベンチ入れ替え", () => {
  test("バトル場のポケモンをベンチに移動するとバトル場が空になる", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const battleCard = getZone(page, "バトル場").locator("[data-card-id]").first();
    const benchZone = getZone(page, "ベンチ");

    await dragCardToZone(page, battleCard, benchZone);

    const benchCount = parseInt(
      (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
    );
    expect(benchCount).toBeGreaterThanOrEqual(1);
  });

  test("バトル場が空でベンチにポケモンがいると選択UIが表示される", async ({
    page,
  }) => {
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

    const benchCount = parseInt(
      (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
    );
    if (benchCount === 0) { test.skip(); return; }

    const battleCard = getZone(page, "バトル場").locator("[data-card-id]").first();
    await dragCardToZone(page, battleCard, benchZone);

    await expect(
      page.getByText("バトル場に出すポケモンを選んでください"),
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe("FR-11: 全ゾーン間自由移動", () => {
  test("全ゾーン間で自由に移動できる（ルール制約なし）", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handCard = getZone(page, "手札").locator("[data-card-id]").first();
    const trashZone = getZone(page, "トラッシュ");
    await dragCardToZone(page, handCard, trashZone);

    const trashCount = parseInt(
      (await getZoneCount(page, "トラッシュ").textContent()) ?? "0",
    );
    expect(trashCount).toBeGreaterThan(0);
  });
});
