import { test, expect } from "@playwright/test";
import { startGameWithSeed } from "./helpers";

test.describe("FR-32: 相手サイド管理 (E2E)", () => {
  test("ゲーム開始時に相手サイドカウンターが6で初期化される", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.locator(".opponent-side-counter .count")).toHaveText("6");
  });

  test("相手サイドカウンターを増減する", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await page.locator(".opponent-side-counter button", { hasText: "-" }).click();
    await expect(page.locator(".opponent-side-counter .count")).toHaveText("5");

    await page.locator(".opponent-side-counter button", { hasText: "+" }).click();
    await expect(page.locator(".opponent-side-counter .count")).toHaveText("6");
  });

  test("相手サイドカウンターは6を超えない", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const plusBtn = page.locator(".opponent-side-counter button", { hasText: "+" });
    await expect(plusBtn).toBeDisabled();
  });
});
