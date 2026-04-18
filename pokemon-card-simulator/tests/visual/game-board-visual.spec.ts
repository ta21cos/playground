import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const css = fs.readFileSync(
  path.resolve(__dirname, "../../src/styles/index.css"),
  "utf-8",
);

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='140'%3E%3Crect width='100' height='140' fill='%23445' rx='6'/%3E%3C/svg%3E";

function html(body: string): string {
  return `<!DOCTYPE html>
<html><head><style>${css}</style></head>
<body style="padding:24px">${body}</body></html>`;
}

function cardImg(name: string, badges: string = ""): string {
  return `<div class="card">
  <img src="${PLACEHOLDER_IMG}" alt="${name}" loading="lazy">
  ${badges}
</div>`;
}

function cardFallback(
  name: string,
  category: string,
  badges: string = "",
): string {
  return `<div class="card card-fallback">
  <div class="card-name">${name}</div>
  <div class="card-category">${category}</div>
  ${badges}
</div>`;
}

function damage(n: number): string {
  return `<div class="damage-counter">${n}</div>`;
}

function cardStack(
  mainCard: string,
  attached: { name: string; category: string }[],
  direction: "right" | "up" = "right",
): string {
  const attachedHtml = attached
    .map(
      (a, i) =>
        `<div class="attached-card" style="z-index:${attached.length - i}">${cardFallback(a.name, a.category)}</div>`,
    )
    .join("");
  if (direction === "up") {
    return `<div class="card-stack card-stack-up">${attachedHtml}${mainCard}</div>`;
  }
  return `<div class="card-stack">${mainCard}${attachedHtml}</div>`;
}

const ZONE_LABELS: Record<string, string> = {
  バトル場: "ACTIVE",
  ベンチ: "BENCH",
  手札: "HAND",
  山札: "DECK",
  トラッシュ: "DISCARD",
  サイド: "PRIZE",
  スタジアム: "STADIUM",
};

function zone(
  name: string,
  count: number,
  cards: string,
  style: string = "",
): string {
  const label = ZONE_LABELS[name] ?? "";
  return `<div class="zone zone-${name}" data-zone="${name}" style="display:inline-flex;flex-direction:column;${style}">
  <div class="zone-header">
    <div class="zone-labels">
      <span class="zone-label-en">${label}</span>
      <span class="zone-name">${name}</span>
    </div>
    <span class="zone-count">${count}</span>
  </div>
  <div class="zone-cards">${cards}</div>
</div>`;
}

function placeholder(): string {
  return `<div class="card-placeholder"></div>`;
}

// ─── Card component ───

test.describe("Card: fallback 表示", () => {
  test("たねポケモン", async ({ page }) => {
    await page.setContent(html(cardFallback("ピカチュウ", "ポケモン")));
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("基本エネルギー", async ({ page }) => {
    await page.setContent(
      html(cardFallback("基本炎エネルギー", "基本エネルギー")),
    );
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("グッズ", async ({ page }) => {
    await page.setContent(html(cardFallback("ネストボール", "グッズ")));
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("スタジアム", async ({ page }) => {
    await page.setContent(html(cardFallback("頂への雪道", "スタジアム")));
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("ポケモンのどうぐ", async ({ page }) => {
    await page.setContent(html(cardFallback("学習装置", "ポケモンのどうぐ")));
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("ダメカン付きポケモン", async ({ page }) => {
    await page.setContent(
      html(cardFallback("ピカチュウ", "ポケモン", damage(30))),
    );
    await expect(page.locator(".card")).toHaveScreenshot();
  });
});

test.describe("Card: 画像表示", () => {
  test("画像のみ", async ({ page }) => {
    await page.setContent(html(cardImg("ピカチュウ")));
    await expect(page.locator(".card")).toHaveScreenshot();
  });

  test("ダメカン 30", async ({ page }) => {
    await page.setContent(html(cardImg("ピカチュウ", damage(30))));
    await expect(page.locator(".card")).toHaveScreenshot();
  });
});

test.describe("Card: 付与カード重ね表示", () => {
  test("エネルギー 2 枚", async ({ page }) => {
    const content = cardStack(cardImg("ピカチュウ"), [
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "基本炎エネルギー", category: "基本エネルギー" },
    ]);
    await page.setContent(html(content));
    await expect(page.locator(".card-stack")).toHaveScreenshot();
  });

  test("どうぐ付き", async ({ page }) => {
    const content = cardStack(cardImg("ピカチュウ"), [
      { name: "学習装置", category: "ポケモンのどうぐ" },
    ]);
    await page.setContent(html(content));
    await expect(page.locator(".card-stack")).toHaveScreenshot();
  });

  test("全部盛り（エネ3 + どうぐ + ダメカン50）", async ({ page }) => {
    const content = cardStack(cardImg("ピカチュウ", damage(50)), [
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "学習装置", category: "ポケモンのどうぐ" },
    ]);
    await page.setContent(html(content));
    await expect(page.locator(".card-stack")).toHaveScreenshot();
  });
});

// ─── Zone: バトル場 ───

test.describe("Zone: バトル場", () => {
  test("ポケモン 1 匹", async ({ page }) => {
    await page.setContent(html(zone("バトル場", 1, cardImg("ピカチュウ"))));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("空", async ({ page }) => {
    await page.setContent(html(zone("バトル場", 0, placeholder())));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("エネルギー + どうぐ + ダメカン付きポケモン", async ({ page }) => {
    const content = cardStack(cardImg("ピカチュウ", damage(30)), [
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "基本炎エネルギー", category: "基本エネルギー" },
      { name: "学習装置", category: "ポケモンのどうぐ" },
    ]);
    await page.setContent(html(zone("バトル場", 1, content)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });
});

// ─── Zone: ベンチ ───

test.describe("Zone: ベンチ", () => {
  test("ポケモン 1 匹 + 空き枠 4 つ", async ({ page }) => {
    const cards = cardImg("コダック") + placeholder().repeat(4);
    await page.setContent(html(zone("ベンチ", 1, cards)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("ポケモン 3 匹 + 空き枠 2 つ", async ({ page }) => {
    const cards =
      cardImg("コダック") +
      cardImg("ゼニガメ") +
      cardImg("フシギダネ") +
      placeholder().repeat(2);
    await page.setContent(html(zone("ベンチ", 3, cards)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("ベンチ満席（5 匹）", async ({ page }) => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      cardImg(`pokemon-${i}`),
    ).join("");
    await page.setContent(html(zone("ベンチ", 5, cards)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("エネルギー付きポケモンがベンチにいる", async ({ page }) => {
    const koduck = cardStack(
      cardImg("コダック"),
      [
        { name: "基本炎エネルギー", category: "基本エネルギー" },
        { name: "基本炎エネルギー", category: "基本エネルギー" },
      ],
      "up",
    );
    const cards = koduck + cardImg("ゼニガメ") + placeholder().repeat(3);
    await page.setContent(html(zone("ベンチ", 2, cards)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });
});

// ─── Zone: 手札 ───

test.describe("Zone: 手札", () => {
  test("混合カード 5 枚", async ({ page }) => {
    const cards =
      cardImg("ピカチュウ") +
      cardFallback("基本炎エネルギー", "基本エネルギー") +
      cardFallback("ネストボール", "グッズ") +
      cardImg("コダック") +
      cardFallback("学習装置", "ポケモンのどうぐ");
    await page.setContent(html(zone("手札", 5, cards)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("空", async ({ page }) => {
    await page.setContent(html(zone("手札", 0, "")));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("ホバー時にカードが拡大される（左端）", async ({ page }) => {
    const cards =
      cardImg("ピカチュウ") +
      cardFallback("基本炎エネルギー", "基本エネルギー") +
      cardFallback("ネストボール", "グッズ") +
      cardImg("コダック") +
      cardFallback("学習装置", "ポケモンのどうぐ");
    await page.setContent(html(zone("手札", 5, cards, "margin:20px")));
    const firstCard = page.locator(".card").first();
    await firstCard.hover();
    await page.waitForTimeout(200);
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("ホバー時にカードが拡大される（中央）", async ({ page }) => {
    const cards =
      cardImg("ピカチュウ") +
      cardFallback("基本炎エネルギー", "基本エネルギー") +
      cardFallback("ネストボール", "グッズ") +
      cardImg("コダック") +
      cardFallback("学習装置", "ポケモンのどうぐ");
    await page.setContent(html(zone("手札", 5, cards, "margin:20px")));
    const middleCard = page.locator(".card").nth(2);
    await middleCard.hover();
    await page.waitForTimeout(200);
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("ホバー時にカードが拡大される（右端）", async ({ page }) => {
    const cards =
      cardImg("ピカチュウ") +
      cardFallback("基本炎エネルギー", "基本エネルギー") +
      cardFallback("ネストボール", "グッズ") +
      cardImg("コダック") +
      cardFallback("学習装置", "ポケモンのどうぐ");
    await page.setContent(html(zone("手札", 5, cards, "margin:20px")));
    const lastCard = page.locator(".card").last();
    await lastCard.hover();
    await page.waitForTimeout(200);
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });
});

// ─── Zone: スタジアム ───

test.describe("Zone: スタジアム", () => {
  test("スタジアム 1 枚", async ({ page }) => {
    await page.setContent(
      html(zone("スタジアム", 1, cardFallback("頂への雪道", "スタジアム"))),
    );
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("空", async ({ page }) => {
    await page.setContent(html(zone("スタジアム", 0, placeholder())));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });
});

// ─── Zone: 山札 / トラッシュ ───

test.describe("Zone: 山札 / トラッシュ", () => {
  test("山札 40 枚", async ({ page }) => {
    const deck = `<div class="deck-stack"><span class="deck-count">40</span></div>`;
    await page.setContent(html(zone("山札", 40, deck)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });

  test("トラッシュ 3 枚", async ({ page }) => {
    const trash = `<div class="trash-stack"><span class="trash-count">3</span></div>`;
    await page.setContent(html(zone("トラッシュ", 3, trash)));
    await expect(page.locator("[data-zone]")).toHaveScreenshot();
  });
});

// ─── UI コンポーネント ───

test.describe("OpponentSideCounter", () => {
  function sideCounter(count: number): string {
    return `<div class="opponent-side-counter">
  <span class="label">相手サイド</span>
  <button ${count <= 0 ? "disabled" : ""}>-</button>
  <span class="count">${count}</span>
  <button ${count >= 6 ? "disabled" : ""}>+</button>
</div>`;
  }

  test("初期値 6", async ({ page }) => {
    await page.setContent(html(sideCounter(6)));
    await expect(page.locator(".opponent-side-counter")).toHaveScreenshot();
  });

  test("残り 0", async ({ page }) => {
    await page.setContent(html(sideCounter(0)));
    await expect(page.locator(".opponent-side-counter")).toHaveScreenshot();
  });
});

test.describe("ActionBar", () => {
  test("進行中（ターン 3）", async ({ page }) => {
    await page.setContent(
      html(`<div class="action-bar">
  <span class="turn-display">ターン 3</span>
  <button>ターン終了</button>
  <button>Undo</button>
  <button>履歴</button>
  <button>リセット</button>
</div>`),
    );
    await expect(page.locator(".action-bar")).toHaveScreenshot();
  });

  test("セットアップ中（ゲーム開始ボタンあり）", async ({ page }) => {
    await page.setContent(
      html(`<div class="action-bar">
  <button>Undo</button>
  <button>履歴</button>
  <button>ゲーム開始</button>
  <button>リセット</button>
</div>`),
    );
    await expect(page.locator(".action-bar")).toHaveScreenshot();
  });
});
