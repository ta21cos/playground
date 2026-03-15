import { test, expect } from "@playwright/test";
import { startGameWithSeed, clickCard } from "./helpers";

test.describe("FR-25: ダメカン管理 (E2E)", () => {
  test("バトル場のポケモンにダメカンを載せる (+10)", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "バトル場");
    await page.getByRole("button", { name: "ダメカン +10" }).click();

    await expect(page.locator(".damage-counter")).toContainText("10");
  });

  test("ダメカンを複数回載せて外す", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "バトル場");
    await page.getByRole("button", { name: "ダメカン +10" }).click();

    await clickCard(page, "バトル場");
    await page.getByRole("button", { name: "ダメカン +10" }).click();
    await expect(page.locator(".damage-counter")).toContainText("20");

    await clickCard(page, "バトル場");
    await page.getByRole("button", { name: "ダメカン -10" }).click();
    await expect(page.locator(".damage-counter")).toContainText("10");
  });
});
