import { test, expect } from "@playwright/test";
import { startGameWithSeed, getZoneCount, clickCard } from "./helpers";

test.describe("FR-26: カードコンテキストメニュー", () => {
  test("手札のカードをタップするとコンテキストメニューが表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "手札");

    await expect(
      page.getByRole("button", { name: "山札の上に戻す" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "山札の下に戻す" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "トラッシュへ" }),
    ).toBeVisible();
  });

  test("手札のカードを山札の上に戻す", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );
    const deckBefore = parseInt(
      (await getZoneCount(page, "山札").textContent()) ?? "0",
    );

    await clickCard(page, "手札");
    await page.getByRole("button", { name: "山札の上に戻す" }).click();

    await expect(getZoneCount(page, "手札")).toHaveText(
      String(handBefore - 1),
    );
    await expect(getZoneCount(page, "山札")).toHaveText(
      String(deckBefore + 1),
    );
  });

  test("手札のカードを山札の下に戻す", async ({ page }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    const handBefore = parseInt(
      (await getZoneCount(page, "手札").textContent()) ?? "0",
    );

    await clickCard(page, "手札");
    await page.getByRole("button", { name: "山札の下に戻す" }).click();

    await expect(getZoneCount(page, "手札")).toHaveText(
      String(handBefore - 1),
    );
  });

  test("バトル場のポケモンをタップするとダメカン操作メニューがある", async ({
    page,
  }) => {
    await page.goto("/");
    await startGameWithSeed(page);

    await clickCard(page, "バトル場");

    await expect(
      page.getByRole("button", { name: "ダメカン +10" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ダメカン -10" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ダメカン値入力" }),
    ).toBeVisible();
  });
});
