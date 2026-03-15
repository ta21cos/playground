import { test, expect } from "@playwright/test";
import {
  setupNormalGame,
  startGameWithSeed,
  getZoneCount,
} from "./helpers";

test.describe("FR-5: 初期配布", () => {
  test("デッキをシャッフルして手札7枚を配り、サイドはまだ配らない", async ({
    page,
  }) => {
    await page.goto("/");
    await setupNormalGame(page);

    await expect(getZoneCount(page, "手札")).toHaveText("7");
    await expect(getZoneCount(page, "山札")).toHaveText("53");
    await expect(getZoneCount(page, "サイド")).toHaveText("0");
  });
});

test.describe("FR-7: ゲーム開始", () => {
  test("バトル場にたねポケモンを配置してゲーム開始 → サイド6枚、ターン1ドロー", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(getZoneCount(page, "サイド")).toHaveText("6");
    await expect(page.getByText(/ターン 1/)).toBeVisible();
    await expect(getZoneCount(page, "バトル場")).toHaveText("1");
  });

  test("バトル場にカードがないとゲームを開始できない", async ({ page }) => {
    await page.goto("/");
    await setupNormalGame(page);

    const startBtn = page.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).not.toBeVisible();
  });
});

test.describe("FR-8: ターン開始ドロー", () => {
  test("ターン終了時に次ターンのドローが自動で行われる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = await getZoneCount(page, "手札").textContent();
    const deckBefore = await getZoneCount(page, "山札").textContent();

    await page.getByRole("button", { name: "ターン終了" }).click();

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckAfter = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    expect(handAfter).toBe(parseInt(handBefore ?? "0") + 1);
    expect(deckAfter).toBe(parseInt(deckBefore ?? "0") - 1);
  });
});

test.describe("FR-9: ターン数表示", () => {
  test("ゲーム開始時のターン数は 1", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);
    await expect(page.getByText("ターン 1")).toBeVisible();
  });

  test("ターン終了ごとにターン数が増加する", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 3")).toBeVisible();
  });
});

test.describe("FR-10: ターン終了", () => {
  test("ターン終了でターン数をインクリメントしドローが行われる", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();
  });
});
