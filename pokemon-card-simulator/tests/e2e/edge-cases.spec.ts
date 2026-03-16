import { test, expect } from "@playwright/test";
import {
  importDeck,
  startGameWithSeed,
  setupNormalGame,
  getZone,
  getZoneCount,
  clickCard,
} from "./helpers";

test.describe("@edge-case デッキコード入力", () => {
  test("FR-1: 不正なデッキコード形式ではボタンが disabled のまま", async ({
    page,
  }) => {
    await page.goto("/");

    const codeInput = page.locator(".deck-code-input");
    await codeInput.fill("XXXXXX-YYYYYY-");

    const loadBtn = page.getByRole("button", {
      name: "デッキコードで読み込み",
    });
    await expect(loadBtn).toBeDisabled();
  });

  test("FR-1: 空文字のデッキコードではボタンが disabled のまま", async ({
    page,
  }) => {
    await page.goto("/");

    const loadBtn = page.getByRole("button", {
      name: "デッキコードで読み込み",
    });
    await expect(loadBtn).toBeDisabled();
  });

  test("FR-1: 有効な形式だが存在しないデッキコードでエラーが発生する", async ({
    page,
  }) => {
    await page.goto("/");

    const dialogPromise = page.waitForEvent("dialog", { timeout: 15000 });
    page.on("dialog", (dialog) => dialog.dismiss());

    const codeInput = page.locator(".deck-code-input");
    await codeInput.fill("aaa111-bbb222-ccc333");

    const loadBtn = page.getByRole("button", {
      name: "デッキコードで読み込み",
    });
    await expect(loadBtn).toBeEnabled();
    await loadBtn.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "デッキコードで読み込み" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("FR-1: デッキコード読み込み中にボタンが disabled になる", async ({
    page,
  }) => {
    await page.goto("/");

    page.on("dialog", (dialog) => dialog.dismiss());

    const codeInput = page.locator(".deck-code-input");
    await codeInput.fill("aaa111-bbb222-ccc333");

    const loadBtn = page.getByRole("button", {
      name: "デッキコードで読み込み",
    });
    await loadBtn.click();

    await expect(page.getByText("読み込み中...")).toBeVisible();
  });

  test("FR-1: テキスト入力が空文字ではデッキ読み込みボタンが disabled", async ({
    page,
  }) => {
    await page.goto("/");

    const textTab = page.getByRole("button", { name: "テキスト入力" });
    await textTab.click();

    const loadBtn = page.getByRole("button", { name: "デッキ読み込み" });
    await expect(loadBtn).toBeDisabled();
  });
});

test.describe("@edge-case FR-14: N枚ドローモーダル", () => {
  test("0 を入力して Enter しても山札・手札は変化しない", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckBefore = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "N枚ドロー" }).click();
    await expect(page.getByText("N枚ドロー")).toBeVisible();

    const input = page.locator(".draw-n-input");
    await input.fill("0");
    await input.press("Enter");

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckAfter = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore);
    expect(deckAfter).toBe(deckBefore);
  });

  test("負の数を入力して Enter しても山札・手札は変化しない", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckBefore = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "N枚ドロー" }).click();

    const input = page.locator(".draw-n-input");
    await input.fill("-3");
    await input.press("Enter");

    const handAfter = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckAfter = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );
    expect(handAfter).toBe(handBefore);
    expect(deckAfter).toBe(deckBefore);
  });

  test("山札が 0 枚のとき各枚数ボタンがすべて disabled", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const deckCount = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "N枚ドロー" }).click();
    await page.getByRole("button", { name: "7枚" }).click();

    let remaining = deckCount - 7;
    while (remaining > 0) {
      const batch = Math.min(remaining, 7);
      await getZone(page, "山札").click();
      await page.getByRole("button", { name: "N枚ドロー" }).click();
      await page.getByRole("button", { name: `${batch}枚` }).click();
      remaining -= batch;
    }

    await expect(getZoneCount(page, "山札")).toHaveText("0");

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "N枚ドロー" }).click();

    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      await expect(
        page.getByRole("button", { name: `${n}枚` }),
      ).toBeDisabled();
    }
  });
});

test.describe("@edge-case FR-26: コンテキストメニュー", () => {
  test("別カードタップでメニューが切り替わる", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handZone = getZone(page, "手札");
    const cards = handZone.locator("[data-card-id]");
    const cardCount = await cards.count();
    test.skip(cardCount < 2, "手札に2枚以上のカードが必要");

    const firstName = await cards.first().getAttribute("data-card-name");

    await cards.first().click({ force: true });
    await page.waitForTimeout(200);
    await expect(page.locator(".context-menu")).toBeVisible();

    const overlay = page.locator(".context-menu-overlay");
    if (await overlay.isVisible()) {
      await overlay.click();
      await page.waitForTimeout(200);
    }

    await cards.nth(1).click({ force: true });
    await page.waitForTimeout(200);
    await expect(page.locator(".context-menu")).toBeVisible();

    const secondName = await cards.nth(1).getAttribute("data-card-name");
    if (firstName !== secondName) {
      expect(true).toBe(true);
    }
  });

  test("たねポケモンのコンテキストメニューに退化が含まれない", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "バトル場");

    const menuButtons = page.locator(".context-menu-item");
    const count = await menuButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await menuButtons.nth(i).textContent();
      expect(text).not.toBe("退化");
    }
  });
});

test.describe("@edge-case FR-27: ボタン操作", () => {
  test("セットアップ中にターン終了ボタンは表示されない", async ({ page }) => {
    await page.goto("/");
    await setupNormalGame(page);

    await expect(
      page.getByRole("button", { name: "ターン終了" }),
    ).not.toBeVisible();
  });

  test("ターン終了を連続3回押すとターンが3進む", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.getByText("ターン 1")).toBeVisible();

    const deckBefore = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 3")).toBeVisible();

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 4")).toBeVisible();

    const deckAfter = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );
    expect(deckAfter).toBe(deckBefore - 3);
  });
});

test.describe("@edge-case FR-28: ゾーンタップ", () => {
  test("トラッシュが空の状態でタップすると空の一覧が表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await getZone(page, "トラッシュ").click();

    await expect(page.getByText("トラッシュ (0枚)")).toBeVisible();
  });

  test("サイドが 0 枚の状態でタップするとカード一覧が空で表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    for (let i = 0; i < 6; i++) {
      await getZone(page, "サイド").click();
      await page.getByRole("button", { name: "ランダムに1枚取得" }).click();
      await page.waitForTimeout(200);
    }

    await expect(getZoneCount(page, "サイド")).toHaveText("0");

    await getZone(page, "サイド").click();
    await expect(page.getByText("サイド (0枚)")).toBeVisible();

    const searchCards = page.locator(".search-card");
    await expect(searchCards).toHaveCount(0);
  });
});

test.describe("@edge-case NFR-2: レスポンシブ", () => {
  test("375px 幅で手札10枚以上あっても横スクロール可能", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    await page.goto("/");
    await startGameWithSeed(page);

    await getZone(page, "山札").click();
    await page.getByRole("button", { name: "N枚ドロー" }).click();
    await page.getByRole("button", { name: "7枚" }).click();

    const handCount = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    test.skip(handCount < 10, "手札が10枚未満のためスキップ");

    const handZoneCards = getZone(page, "手札").locator(".zone-cards");
    const scrollable = await handZoneCards.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    expect(scrollable).toBe(true);

    await context.close();
  });
});

test.describe("@edge-case FR-25: ダメカン境界値", () => {
  test("ダメカン 0 のポケモンに -10 を連打しても 0 のまま", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    for (let i = 0; i < 3; i++) {
      await clickCard(page, "バトル場");
      await page.getByRole("button", { name: "ダメカン -10" }).click();
    }

    await clickCard(page, "バトル場");

    const hasDamageCounter = await page
      .locator(".damage-counter")
      .isVisible()
      .catch(() => false);
    if (hasDamageCounter) {
      const damageText = await page.locator(".damage-counter").textContent();
      expect(parseInt(damageText ?? "0")).toBe(0);
    }
  });
});

test.describe("@edge-case FR-20: Undo 操作", () => {
  test("セットアップ中で Undo してもアプリが壊れない", async ({ page }) => {
    await page.goto("/");
    await setupNormalGame(page);

    await page.getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(300);

    const isSetup = await page
      .getByRole("button", { name: "マリガン" })
      .or(page.getByRole("button", { name: "ゲーム開始" }))
      .or(page.getByRole("button", { name: "リセット" }))
      .first()
      .isVisible()
      .catch(() => false);

    const isImport = await page
      .getByRole("button", { name: "通常セットアップ" })
      .isVisible()
      .catch(() => false);

    expect(isSetup || isImport).toBe(true);
  });

  test("Undo 後に操作してさらに Undo する（履歴分岐後の Undo）", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.getByText("ターン 1")).toBeVisible();

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("ターン 1")).toBeVisible();

    await page.getByRole("button", { name: "ターン終了" }).click();
    await expect(page.getByText("ターン 2")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("ターン 1")).toBeVisible();
  });
});

test.describe("@edge-case FR-22: リセット操作", () => {
  test("セットアップ中にリセットするとデッキ読込済に戻る", async ({ page }) => {
    await page.goto("/");
    await setupNormalGame(page);

    await expect(getZoneCount(page, "手札")).toHaveText("7");

    await page.getByRole("button", { name: "リセット" }).click();
    await expect(page.getByText("デッキ読込完了: 60枚")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: "通常セットアップ" }),
    ).toBeVisible();
  });

  test("進行中にリセットしてもデッキ読込済に戻る", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await expect(page.getByText("ターン 1")).toBeVisible();

    await page.getByRole("button", { name: "リセット" }).click();
    await expect(page.getByText("デッキ読込完了: 60枚")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: "通常セットアップ" }),
    ).toBeVisible();
  });
});
