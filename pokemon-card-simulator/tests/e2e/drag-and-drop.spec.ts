import { test, expect } from "@playwright/test";
import {
  startGameWithSeed,
  dragCardToZone,
  getZone,
  getZoneCount,
  getCardInZone,
} from "./helpers";

test.describe("FR-11: ドラッグ&ドロップ移動", () => {
  test("カードをドラッグ&ドロップでゾーン間移動できる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const trashBefore = parseInt(
      (await getZoneCount(page, "トラッシュ").textContent()) ?? "0",
    );

    const card = getCardInZone(page, "手札");
    const trashZone = getZone(page, "トラッシュ");
    await dragCardToZone(page, card, trashZone);

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const trashAfter = parseInt(
      (await getZoneCount(page, "トラッシュ").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore - 1);
    expect(trashAfter).toBe(trashBefore + 1);
  });

  test("手札からベンチにドラッグ&ドロップできる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const benchBefore = parseInt(
      (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
    );

    const card = getCardInZone(page, "手札");
    const benchZone = getZone(page, "ベンチ");
    await dragCardToZone(page, card, benchZone);

    const benchAfter = parseInt(
      (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
    );
    expect(benchAfter).toBeGreaterThan(benchBefore);
  });
});
