import { test, expect } from "@playwright/test";
import {
  importDeck,
  dragCardToZone,
  getZone,
  getZoneCount,
  clickCard,
} from "./helpers";

const EVOLUTION_DECK = `メリープ 4
モココ 4
デンリュウ 4
ストライク 4
ハンドトリマー 4
プライムキャッチャー 4
リブートポッド 4
暗号マニアの解読 4
セイジ 4
ミストエネルギー 24`;

async function setupEvolutionGame(page: import("@playwright/test").Page) {
  await importDeck(page, EVOLUTION_DECK);
  await page.getByRole("button", { name: "通常セットアップ" }).click();
  await expect(getZoneCount(page, "手札")).toHaveText("7");

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

    for (const name of ["メリープ", "ストライク"]) {
      const card = handZone.locator(`[data-card-name="${name}"]`).first();
      if (await card.isVisible().catch(() => false)) {
        await dragCardToZone(page, card, battleZone);
        await page.waitForTimeout(300);
        break;
      }
    }
    break;
  }

  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect(page.getByText(/ターン 1/)).toBeVisible();
}

test.describe("FR-34: 進化操作", () => {
  test("手札の進化ポケモンをバトル場のポケモンに重ねて進化させる", async ({
    page,
  }) => {
    await page.goto("/");
    await setupEvolutionGame(page);

    const battlePokemonName = await getZone(page, "バトル場")
      .locator("[data-card-name]")
      .first()
      .getAttribute("data-card-name");

    let evoName = "";
    if (battlePokemonName === "メリープ") evoName = "モココ";
    else {
      test.skip();
      return;
    }

    const evoCard = getZone(page, "手札")
      .locator(`[data-card-name="${evoName}"]`)
      .first();
    const hasEvo = await evoCard.isVisible().catch(() => false);
    if (!hasEvo) { test.skip(); return; }

    const battlePokemon = getZone(page, "バトル場")
      .locator('[data-card-category="ポケモン"]')
      .first();
    await dragCardToZone(page, evoCard, battlePokemon);

    await expect(
      getZone(page, "バトル場").locator(`[data-card-name="${evoName}"]`),
    ).toBeVisible();
  });

  test("進化してもエネルギー・ダメカンは引き継がれる", async ({ page }) => {
    await page.goto("/");
    await setupEvolutionGame(page);

    const battlePokemonName = await getZone(page, "バトル場")
      .locator("[data-card-name]")
      .first()
      .getAttribute("data-card-name");
    if (battlePokemonName !== "メリープ") { test.skip(); return; }

    const energyCard = getZone(page, "手札")
      .locator('[data-card-category="特殊エネルギー"]')
      .first();
    const hasEnergy = await energyCard.isVisible().catch(() => false);
    if (hasEnergy) {
      const target = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
      await dragCardToZone(page, energyCard, target);
    }

    await clickCard(page, "バトル場");
    await page.getByRole("button", { name: "ダメカン +10" }).click();

    const evoCard = getZone(page, "手札").locator('[data-card-name="モココ"]').first();
    const hasEvo = await evoCard.isVisible().catch(() => false);
    if (!hasEvo) { test.skip(); return; }

    const battlePokemon = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, evoCard, battlePokemon);

    await expect(page.locator('[data-zone="バトル場"] .damage-counter')).toContainText("10");
    if (hasEnergy) {
      await expect(page.locator('[data-zone="バトル場"] .energy-count')).toBeVisible();
    }
  });

  test("2段階進化ができる", async ({ page }) => {
    await page.goto("/");
    await setupEvolutionGame(page);

    const battlePokemonName = await getZone(page, "バトル場")
      .locator("[data-card-name]")
      .first()
      .getAttribute("data-card-name");
    if (battlePokemonName !== "メリープ") { test.skip(); return; }

    const mokoko = getZone(page, "手札").locator('[data-card-name="モココ"]').first();
    if (!(await mokoko.isVisible().catch(() => false))) { test.skip(); return; }

    let target = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, mokoko, target);
    await expect(getZone(page, "バトル場").locator('[data-card-name="モココ"]')).toBeVisible();

    const denryu = getZone(page, "手札").locator('[data-card-name="デンリュウ"]').first();
    if (!(await denryu.isVisible().catch(() => false))) { test.skip(); return; }

    target = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, denryu, target);
    await expect(getZone(page, "バトル場").locator('[data-card-name="デンリュウ"]')).toBeVisible();
  });
});

test.describe("FR-35: 退化操作", () => {
  test("2段階進化から1段階退化する", async ({ page }) => {
    await page.goto("/");
    await setupEvolutionGame(page);

    const battlePokemonName = await getZone(page, "バトル場")
      .locator("[data-card-name]")
      .first()
      .getAttribute("data-card-name");
    if (battlePokemonName !== "メリープ") { test.skip(); return; }

    const mokoko = getZone(page, "手札").locator('[data-card-name="モココ"]').first();
    if (!(await mokoko.isVisible().catch(() => false))) { test.skip(); return; }
    let target = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, mokoko, target);

    const denryu = getZone(page, "手札").locator('[data-card-name="デンリュウ"]').first();
    if (!(await denryu.isVisible().catch(() => false))) { test.skip(); return; }
    target = getZone(page, "バトル場").locator('[data-card-category="ポケモン"]').first();
    await dragCardToZone(page, denryu, target);

    await clickCard(page, "バトル場");
    await expect(page.getByRole("button", { name: "退化" })).toBeVisible();
    await page.getByRole("button", { name: "退化" }).click();

    await expect(getZone(page, "バトル場").locator('[data-card-name="モココ"]')).toBeVisible();
    await expect(getZone(page, "手札").locator('[data-card-name="デンリュウ"]')).toBeVisible();
  });
});
