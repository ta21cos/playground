import { test, expect } from "@playwright/test";
import { startGameWithSeed, getZone, getZoneCount, clickCard } from "./helpers";

test.describe("FR-28: ゾーンタップ操作", () => {
  test("山札タップでサーチメニューが表示される", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await getZone(page, "山札").click();
    await expect(page.getByText("山札サーチ")).toBeVisible();
  });

  test("山札サーチでカードを選んで手札に加える", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );

    await getZone(page, "山札").click();
    await expect(page.getByText("山札サーチ")).toBeVisible();

    await page.locator(".search-card").first().click();
    await page.locator(".modal-actions button").first().click();

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore + 1);
  });

  test("山札サーチでカードを選ばずに終了できる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "選ばずに終了" }).click();

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore);
  });

  test("サイドゾーンタップでサイド一覧が表示される", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await getZone(page, "サイド").click();
    await expect(page.getByText(/サイド.*6枚/)).toBeVisible();
  });

  test("サイドからカードを選んで手札に加える", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );

    await getZone(page, "サイド").click();
    await page.locator(".search-card").first().click();

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore + 1);
    await expect(getZoneCount(page, "サイド")).toHaveText("5");
  });

  test("サイドからランダムに1枚取得する", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await getZone(page, "サイド").click();
    await page.getByRole("button", { name: "ランダムに1枚取得" }).click();
    await expect(getZoneCount(page, "サイド")).toHaveText("5");
  });

  test("トラッシュタップでトラッシュ一覧が表示される", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "手札");
    await page.getByRole("button", { name: "トラッシュへ" }).click();
    await page.waitForTimeout(200);

    await getZone(page, "トラッシュ").click();
    await expect(page.getByText(/トラッシュ.*\d+枚/)).toBeVisible();
  });

  test("トラッシュ一覧からカードを手札に戻す", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );

    await clickCard(page, "手札");
    await page.getByRole("button", { name: "トラッシュへ" }).click();
    await page.waitForTimeout(200);

    await getZone(page, "トラッシュ").click();
    await page.getByRole("button", { name: "手札" }).first().click();

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore);
  });

  test("トラッシュ一覧からカードを山札の上に戻す", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const deckBefore = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await clickCard(page, "手札");
    await page.getByRole("button", { name: "トラッシュへ" }).click();
    await page.waitForTimeout(200);

    await getZone(page, "トラッシュ").click();
    await page.getByRole("button", { name: "上" }).first().click();

    const deckAfter = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );
    expect(deckAfter).toBe(deckBefore + 1);
  });

  test("ベンチゾーン横の +/- ボタンでベンチ枠を増減する", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const benchArea = page.locator(".board-bench");
    await expect(benchArea.locator("span").filter({ hasText: /^5$/ })).toBeVisible();

    await benchArea.getByRole("button", { name: "+" }).click();
    await expect(benchArea.locator("span").filter({ hasText: /^6$/ })).toBeVisible();

    await benchArea.getByRole("button", { name: "-" }).click();
    await expect(benchArea.locator("span").filter({ hasText: /^5$/ })).toBeVisible();
  });
});
