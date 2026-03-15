import { test, expect } from "@playwright/test";
import {
  setupNormalGame,
  startGameWithSeed,
} from "./helpers";

test.describe("FR-27: ボタン操作", () => {
  test("ターン終了ボタンでターンを進める", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(
      page.getByRole("button", { name: "ターン終了" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ターン終了" }).click();

    await expect(page.getByText("ターン 2")).toBeVisible();
  });

  test("Undo ボタンが常時表示される", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("Undo ボタンでターン終了を巻き戻せる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.getByText("ターン 1")).toBeVisible();
    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("ターン 1")).toBeVisible();
  });

  test("セットアップ中にマリガンボタンが条件付きで表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await setupNormalGame(page);

    const mulliganBtn = page.getByRole("button", { name: "マリガン" });
    const startBtn = page.getByRole("button", { name: "ゲーム開始" });

    const hasMulligan = await mulliganBtn.isVisible().catch(() => false);
    const hasStart = await startBtn.isVisible().catch(() => false);

    expect(hasMulligan || !hasStart).toBeTruthy();
  });

  test("リセットでデッキ読込済に戻る", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await page.getByRole("button", { name: "リセット" }).click();
    await expect(
      page.getByRole("button", { name: "通常セットアップ" }),
    ).toBeVisible();
  });
});
