import { test, expect } from "@playwright/test";

test.describe("NFR-1: PWA オフライン対応", () => {
  test("Service Worker が登録される", async ({ page }) => {
    await page.goto("/");

    const hasSWApi = await page.evaluate(() => "serviceWorker" in navigator);
    expect(hasSWApi).toBe(true);
  });
});

test.describe("NFR-2: モバイルレスポンシブ", () => {
  test("スマートフォンサイズ(375px)でレイアウトが崩れない", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto("/");

    await page.getByRole("button", { name: "テキスト入力" }).click();
    await page.getByRole("textbox").fill(`ストライク 4
クヌギダマ 4
タネボー 4
キノココ 4
シキジカ 4
ハンドトリマー 4
プライムキャッチャー 4
リブートポッド 4
暗号マニアの解読 4
セイジ 4
ミストエネルギー 20`);
    await page.getByRole("button", { name: "デッキ読み込み" }).click();
    await page.getByRole("button", { name: "通常セットアップ" }).click();

    const gameBoard = page.locator(".game-board");
    await expect(gameBoard).toBeVisible();

    const boardBox = await gameBoard.boundingBox();
    expect(boardBox).not.toBeNull();
    expect(boardBox!.width).toBeLessThanOrEqual(375);

    const zones = page.locator("[data-zone]");
    const zoneCount = await zones.count();
    expect(zoneCount).toBeGreaterThanOrEqual(5);

    for (let i = 0; i < zoneCount; i++) {
      const zone = zones.nth(i);
      const box = await zone.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    }

    await context.close();
  });
});
