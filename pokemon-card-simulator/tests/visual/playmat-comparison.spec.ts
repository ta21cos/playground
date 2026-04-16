import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.resolve(__dirname, "__screenshots__/playmat-comparison");

/**
 * SVG playmat と HTML game board を同じ寸法で撮影し、視覚的に比較する。
 *
 * 仕組み:
 * - viewport: SVG viewBox (1000 x 660) と同じ比率
 * - 各テストで page.screenshot() を直接呼び、PNG を __screenshots__/playmat-comparison/ に保存
 * - SVG (svg-benchN.png) と HTML (html-benchN.png) を並べて視覚的に diff
 *
 * 実行: npx playwright test --config playwright.visual.config.ts playmat-comparison
 */

// 1000x900: 高さに余裕を持たせて max-width 制約を回避し、SVG と同じ 1000x660 で board を描画
const VIEWPORT = { width: 1000, height: 900 } as const;
const BASE_URL = "http://localhost:5173";

const TEST_DECK = `ストライク 4
クヌギダマ 4
タネボー 4
キノココ 4
シキジカ 4
ハンドトリマー 4
プライムキャッチャー 4
リブートポッド 4
暗号マニアの解読 4
セイジ 4
ミストエネルギー 20`;

async function setupGame(
  page: import("@playwright/test").Page,
  benchSize: number,
) {
  await page.goto(BASE_URL);
  await page.getByRole("button", { name: "テキスト入力" }).click();
  await page.getByRole("textbox").fill(TEST_DECK);
  await page.getByRole("button", { name: "デッキ読み込み" }).click();
  await expect(page.getByText("デッキ読込完了: 60枚")).toBeVisible();
  await page.getByRole("button", { name: "通常セットアップ" }).click();
  await expect(page.locator("[data-zone=ベンチ]")).toBeVisible();

  if (benchSize !== 5) {
    const delta = benchSize - 5;
    const btn = page.locator(".bench-btn", {
      hasText: delta > 0 ? "+" : "-",
    });
    for (let i = 0; i < Math.abs(delta); i++) {
      await btn.click();
    }
  }
}

async function hideNonPlaymatElements(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    // 手札のカード画像をクリアして、SVG のレイアウト比較に集中
    document.querySelectorAll(".zone-手札 .zone-cards").forEach((el) => {
      (el as HTMLElement).innerHTML = "";
    });
    // ベンチ枠数調整ボタン (SVG にはない)
    const ctrl = document.querySelector(".bench-controls");
    if (ctrl) (ctrl as HTMLElement).style.display = "none";
    // OPPONENT カウンタ・アクションバー (SVG キャンバス外)
    const oc = document.querySelector(".opponent-side-counter");
    if (oc) (oc as HTMLElement).style.display = "none";
    const ab = document.querySelector(".action-bar");
    if (ab) (ab as HTMLElement).style.display = "none";
  });
}

function ensureDir() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

test.describe("Playmat 比較: SVG vs HTML", () => {
  test.use({ viewport: VIEWPORT });

  test("SVG bench-5 (baseline)", async ({ page }) => {
    ensureDir();
    // SVG を 1000x660 で固定描画
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0c0c14">
      <img src="${BASE_URL}/playmat-bench5.svg" width="1000" height="660" style="display:block">
    </body></html>`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SHOTS_DIR, "svg-bench5.png"),
      clip: { x: 0, y: 0, width: 1000, height: 660 },
    });
  });

  test("HTML bench-5 (current)", async ({ page }) => {
    ensureDir();
    await setupGame(page, 5);
    await hideNonPlaymatElements(page);
    const board = page.locator(".game-board");
    await board.screenshot({
      path: path.join(SHOTS_DIR, "html-bench5.png"),
    });
  });

  test("SVG bench-8 (baseline)", async ({ page }) => {
    ensureDir();
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0c0c14">
      <img src="${BASE_URL}/playmat-bench8.svg" width="1000" height="660" style="display:block">
    </body></html>`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SHOTS_DIR, "svg-bench8.png"),
      clip: { x: 0, y: 0, width: 1000, height: 660 },
    });
  });

  test("HTML bench-8 (current)", async ({ page }) => {
    ensureDir();
    await setupGame(page, 8);
    await hideNonPlaymatElements(page);
    const board = page.locator(".game-board");
    await board.screenshot({
      path: path.join(SHOTS_DIR, "html-bench8.png"),
    });
  });
});
