import { test, expect } from "@playwright/test";
import {
  importDeck,
  setupNormalGame,
  startGameWithSeed,
  dragCardToZone,
  getZone,
  getZoneCount,
  getCardInZone,
} from "./helpers";

const FULL_DECK = `メリープ 4
モココ 4
デンリュウ 4
ストライク 4
ハンドトリマー 4
プライムキャッチャー 4
リブートポッド 4
暗号マニアの解読 4
セイジ 4
ミストエネルギー 24`;

async function setupWithDeck(
  page: import("@playwright/test").Page,
  deck: string,
) {
  await importDeck(page, deck);
  await page.getByRole("button", { name: "通常セットアップ" }).click();
  await expect(getZoneCount(page, "手札")).toHaveText("7");
}

async function placeSeedAndStart(page: import("@playwright/test").Page) {
  const seedNames = ["ストライク", "メリープ"];
  const handZone = getZone(page, "手札");
  const battleZone = getZone(page, "バトル場");

  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await getZoneCount(page, "バトル場").textContent();
    if (count && parseInt(count) > 0) break;

    const mulliganBtn = page.getByRole("button", { name: "マリガン" });
    if (await mulliganBtn.isVisible().catch(() => false)) {
      await mulliganBtn.click();
      await page.waitForTimeout(300);
      continue;
    }

    for (const name of seedNames) {
      const card = handZone.locator(`[data-card-name="${name}"]`).first();
      if (await card.isVisible().catch(() => false)) {
        await dragCardToZone(page, card, battleZone);
        const afterCount = await getZoneCount(page, "バトル場").textContent();
        if (afterCount && parseInt(afterCount) > 0) break;
      }
    }
  }

  const startBtn = page.getByRole("button", { name: "ゲーム開始" });
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await expect(page.getByText(/ターン 1/)).toBeVisible({ timeout: 5000 });
  }
}

test.describe("DnD 操作の網羅テスト", () => {
  test.describe("ゾーン間カード移動", () => {
    test("手札 → トラッシュ", async ({ page }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const before = parseInt(
        (await getZoneCount(page, "手札").textContent()) ?? "0",
      );
      const card = getCardInZone(page, "手札");
      const trashZone = getZone(page, "トラッシュ");

      await dragCardToZone(page, card, trashZone);

      const after = parseInt(
        (await getZoneCount(page, "手札").textContent()) ?? "0",
      );
      expect(after).toBe(before - 1);
      expect(
        parseInt((await getZoneCount(page, "トラッシュ").textContent()) ?? "0"),
      ).toBeGreaterThan(0);
    });

    test("手札 → ベンチ", async ({ page }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const benchBefore = parseInt(
        (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
      );
      const seedNames = [
        "ストライク",
        "クヌギダマ",
        "タネボー",
        "キノココ",
        "シキジカ",
      ];
      const handZone = getZone(page, "手札");
      const benchZone = getZone(page, "ベンチ");

      for (const name of seedNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          await dragCardToZone(page, card, benchZone);
          break;
        }
      }

      const benchAfter = parseInt(
        (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
      );
      expect(benchAfter).toBeGreaterThan(benchBefore);
    });

    test("バトル場 → ベンチ", async ({ page }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const battleCard = getZone(page, "バトル場")
        .locator("[data-card-id]")
        .first();
      const benchZone = getZone(page, "ベンチ");

      await dragCardToZone(page, battleCard, benchZone);

      const benchCount = parseInt(
        (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
      );
      expect(benchCount).toBeGreaterThanOrEqual(1);
    });

    test("手札 → バトル場（セットアップ中）", async ({ page }) => {
      await page.goto("/");
      await setupNormalGame(page);

      const seedNames = [
        "ストライク",
        "クヌギダマ",
        "タネボー",
        "キノココ",
        "シキジカ",
      ];
      const handZone = getZone(page, "手札");
      const battleZone = getZone(page, "バトル場");

      for (const name of seedNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          await dragCardToZone(page, card, battleZone);
          break;
        }
      }

      const battleCount = parseInt(
        (await getZoneCount(page, "バトル場").textContent()) ?? "0",
      );
      expect(battleCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("エネルギー付与（DnD → カード）", () => {
    test("手札エネルギー → バトル場ポケモンに付与", async ({ page }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const handZone = getZone(page, "手札");
      const energy = handZone
        .locator('[data-card-name="ミストエネルギー"]')
        .first();
      if (!(await energy.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const battlePokemon = getZone(page, "バトル場")
        .locator('[data-card-category="ポケモン"]')
        .first();
      if (!(await battlePokemon.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dragCardToZone(page, energy, battlePokemon);

      await expect(
        getZone(page, "バトル場").locator(".energy-count"),
      ).toBeVisible({ timeout: 3000 });
    });

    test("手札エネルギー → ベンチポケモンに付与", async ({ page }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const handZone = getZone(page, "手札");
      const benchZone = getZone(page, "ベンチ");

      const seedNames = [
        "ストライク",
        "クヌギダマ",
        "タネボー",
        "キノココ",
        "シキジカ",
      ];
      let benchPlaced = false;
      for (const name of seedNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          await dragCardToZone(page, card, benchZone);
          benchPlaced = true;
          break;
        }
      }
      if (!benchPlaced) {
        test.skip();
        return;
      }

      const energy = handZone
        .locator('[data-card-name="ミストエネルギー"]')
        .first();
      if (!(await energy.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const benchPokemon = benchZone
        .locator('[data-card-category="ポケモン"]')
        .first();
      await dragCardToZone(page, energy, benchPokemon);

      await expect(benchZone.locator(".energy-count")).toBeVisible({
        timeout: 3000,
      });
    });
  });

  test.describe("エネルギー付与（DnD → ゾーン自動付与）", () => {
    test("手札エネルギー → バトル場ゾーンにドロップで自動付与", async ({
      page,
    }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const handZone = getZone(page, "手札");
      const energy = handZone
        .locator('[data-card-name="ミストエネルギー"]')
        .first();
      if (!(await energy.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const battleZone = getZone(page, "バトル場");
      await dragCardToZone(page, energy, battleZone);

      await expect(battleZone.locator(".energy-count")).toBeVisible({
        timeout: 3000,
      });
    });
  });

  test.describe("どうぐ付与（DnD）", () => {
    test("手札どうぐ → バトル場ポケモンに付与", async ({ page }) => {
      await page.goto("/");

      const TOOL_DECK = `ストライク 4
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

      await setupWithDeck(page, TOOL_DECK);
      await placeSeedAndStart(page);

      const handZone = getZone(page, "手札");
      const toolNames = [
        "ハンドトリマー",
        "プライムキャッチャー",
        "リブートポッド",
      ];
      let toolCard: import("@playwright/test").Locator | null = null;

      for (const name of toolNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          const cat = await card.getAttribute("data-card-category");
          if (cat === "ポケモンのどうぐ") {
            toolCard = card;
            break;
          }
        }
      }
      if (!toolCard) {
        test.skip();
        return;
      }

      const battlePokemon = getZone(page, "バトル場")
        .locator('[data-card-category="ポケモン"]')
        .first();
      await dragCardToZone(page, toolCard, battlePokemon);

      await expect(
        getZone(page, "バトル場").locator(".tool-indicator"),
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("進化（DnD）", () => {
    test("手札の進化ポケモン → バトル場のたねポケモンに重ねて進化", async ({
      page,
    }) => {
      await page.goto("/");
      await setupWithDeck(page, FULL_DECK);

      const handZone = getZone(page, "手札");
      const battleZone = getZone(page, "バトル場");

      for (let attempt = 0; attempt < 10; attempt++) {
        const count = await getZoneCount(page, "バトル場").textContent();
        if (count && parseInt(count) > 0) break;

        const mulliganBtn = page.getByRole("button", { name: "マリガン" });
        if (await mulliganBtn.isVisible().catch(() => false)) {
          await mulliganBtn.click();
          await page.waitForTimeout(300);
          continue;
        }

        const meriipu = handZone.locator('[data-card-name="メリープ"]').first();
        if (await meriipu.isVisible().catch(() => false)) {
          await dragCardToZone(page, meriipu, battleZone);
        }
      }

      const battleCount = await getZoneCount(page, "バトル場").textContent();
      if (!battleCount || parseInt(battleCount) === 0) {
        test.skip();
        return;
      }

      const battlePokemonName = await battleZone
        .locator("[data-card-name]")
        .first()
        .getAttribute("data-card-name");

      const startBtn = page.getByRole("button", { name: "ゲーム開始" });
      await startBtn.click();
      await expect(page.getByText(/ターン 1/)).toBeVisible({ timeout: 5000 });

      if (battlePokemonName !== "メリープ") {
        test.skip();
        return;
      }

      const mokoko = handZone.locator('[data-card-name="モココ"]').first();
      if (!(await mokoko.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const battleTarget = battleZone
        .locator('[data-card-category="ポケモン"]')
        .first();
      await dragCardToZone(page, mokoko, battleTarget);

      await expect(battleZone.locator('[data-card-name="モココ"]')).toBeVisible(
        { timeout: 3000 },
      );
    });
  });

  test.describe("ポケモン移動時の付与カード自動トラッシュ（DnD）", () => {
    test("エネルギー付きポケモンをトラッシュに移動するとエネルギーもトラッシュへ", async ({
      page,
    }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const handZone = getZone(page, "手札");
      const battleZone = getZone(page, "バトル場");
      const trashZone = getZone(page, "トラッシュ");

      const energy = handZone
        .locator('[data-card-name="ミストエネルギー"]')
        .first();
      if (!(await energy.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dragCardToZone(page, energy, battleZone);
      await expect(battleZone.locator(".energy-count")).toBeVisible({
        timeout: 3000,
      });

      const trashBefore = parseInt(
        (await getZoneCount(page, "トラッシュ").textContent()) ?? "0",
      );

      const pokemon = battleZone
        .locator('[data-card-category="ポケモン"]')
        .first();
      await dragCardToZone(page, pokemon, trashZone);

      const trashAfter = parseInt(
        (await getZoneCount(page, "トラッシュ").textContent()) ?? "0",
      );
      expect(trashAfter).toBeGreaterThanOrEqual(trashBefore + 2);
    });
  });

  test.describe("カード→カードのフォールバック移動（DnD）", () => {
    test("たねポケモンをベンチのポケモン上にドロップするとベンチに移動する", async ({
      page,
    }) => {
      await page.goto("/");
      await startGameWithSeed(page);

      const handZone = getZone(page, "手札");
      const benchZone = getZone(page, "ベンチ");

      const seedNames = [
        "ストライク",
        "クヌギダマ",
        "タネボー",
        "キノココ",
        "シキジカ",
      ];
      let placed = false;
      for (const name of seedNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          await dragCardToZone(page, card, benchZone);
          placed = true;
          break;
        }
      }
      if (!placed) {
        test.skip();
        return;
      }

      const benchBefore = parseInt(
        (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
      );

      let secondSeed: import("@playwright/test").Locator | null = null;
      for (const name of seedNames) {
        const card = handZone.locator(`[data-card-name="${name}"]`).first();
        if (await card.isVisible().catch(() => false)) {
          secondSeed = card;
          break;
        }
      }
      if (!secondSeed) {
        test.skip();
        return;
      }

      const benchPokemon = benchZone
        .locator('[data-card-category="ポケモン"]')
        .first();
      await dragCardToZone(page, secondSeed, benchPokemon);

      const benchAfter = parseInt(
        (await getZoneCount(page, "ベンチ").textContent()) ?? "0",
      );
      expect(benchAfter).toBeGreaterThan(benchBefore);
    });
  });
});
