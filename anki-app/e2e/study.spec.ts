import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

function createTempFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anki-e2e-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function importDeck(
  page: import("@playwright/test").Page,
  fileName: string,
  content: string,
  deckName?: string,
) {
  await page.goto("/import");
  const filePath = createTempFile(fileName, content);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  if (deckName) {
    const deckInput = page.locator("#deck-name");
    await deckInput.clear();
    await deckInput.fill(deckName);
  }
  await page.getByRole("button", { name: "インポート" }).click();
  await expect(page.getByText("インポート完了")).toBeVisible();
  fs.unlinkSync(filePath);
}

test.describe("Study - Deck with due cards", () => {
  test("shows study page with card front and answer button", async ({
    page,
  }) => {
    await importDeck(
      page,
      "study.txt",
      "hello\tこんにちは\nworld\t世界\n",
      "学習テスト",
    );

    await page.goto("/");
    await page.getByText("学習テスト").click();

    await expect(page.getByText("学習テスト")).toBeVisible();
    await expect(page.getByText("残り")).toBeVisible();
    await expect(page.getByText("答えを見る")).toBeVisible();
  });

  test("reveals answer and shows rating buttons on click", async ({ page }) => {
    await importDeck(page, "study2.txt", "apple\tりんご\n", "回答テスト");

    await page.goto("/");
    await page.getByText("回答テスト").click();

    await page.getByText("答えを見る").click();

    await expect(page.getByText("Again")).toBeVisible();
    await expect(page.getByText("Hard")).toBeVisible();
    await expect(page.getByText("Good")).toBeVisible();
    await expect(page.getByText("Easy")).toBeVisible();
  });

  test("rates card and progresses to next or completion", async ({ page }) => {
    await importDeck(page, "study3.txt", "q1\ta1\n", "進行テスト");

    await page.goto("/");
    await page.getByText("進行テスト").click();

    await page.getByText("答えを見る").click();
    await page.getByText("Easy").click();

    await expect(page.getByText("学習完了")).toBeVisible();
  });
});

test.describe("Study - Deck list due count", () => {
  test("shows due count badge on deck list", async ({ page }) => {
    await importDeck(page, "due.txt", "a\tb\nc\td\n", "バッジテスト");

    await page.goto("/");

    const badge = page.locator("span.rounded-full.bg-primary");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("2");
  });
});

test.describe("Study - No deck found", () => {
  test("shows error when deck does not exist", async ({ page }) => {
    await page.goto("/study/nonexistent-id");
    await expect(page.getByText("デッキが見つかりません")).toBeVisible();
  });
});
