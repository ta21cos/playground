# DnD E2E テスト安定化計画

> 調査日: 2026-03-18

## 根本原因

| # | 原因 | 確度 |
|---|------|-----|
| 1 | `mouse.down()` 後の最初の move ステップが 8px 未満 → ドラッグ未起動 → `onClick` 誤発火 → コンテキストメニュー妨害 | 高 |
| 2 | `waitForTimeout(10)` がブラウザ描画サイクル（16.67ms）より短く、React の re-render が間に合わない | 中 |
| 3 | `cardFirstCollision` の `pointerWithin` がオーバーラップしたカードで誤マッチ | 中 |
| 4 | 手札カードの `margin-left: -16px` で boundingBox が重なり、隣接カードの pointerDown が誤発火 | 低 |

## 解決策

### 案A: dragCardToZone ヘルパーの改善（即効性あり）

```typescript
async function dragCardToZone(page, card, targetZone) {
  const cardBox = await card.boundingBox();
  const zoneBox = await targetZone.boundingBox();
  if (!cardBox || !zoneBox) throw new Error("Element not found");

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = zoneBox.x + zoneBox.width / 2;
  const endY = zoneBox.y + zoneBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // activationConstraint.distance(8px) を確実に超える初期移動
  await page.mouse.move(startX + 10, startY, { steps: 3 });
  await page.waitForTimeout(50);

  // ターゲットへ移動
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(50);

  // ドロップ
  await page.mouse.move(endX, endY);
  await page.mouse.up();
  await page.waitForTimeout(200);
}
```

**ポイント**: `mouse.down()` 直後に `+10px` 移動して distance 閾値を確実に超えてからターゲットに向かう。

### 案B: `window.__TEST_API__` で dispatch 直接呼び出し（根本解決）

セットアップ処理など「DnD の UI 動作自体をテストしたいわけではない」箇所で dispatch をバイパスする。

```typescript
// App.tsx に追加
useEffect(() => {
  if (import.meta.env.DEV) {
    window.__TEST_API__ = { dispatch };
  }
}, [dispatch]);
```

```typescript
// tests/e2e/helpers.ts
export async function dispatchAction(page, action) {
  await page.evaluate((act) => {
    window.__TEST_API__?.dispatch(act);
  }, action);
  await page.waitForTimeout(50);
}
```

`startGameWithSeed` 内の `ensureSeedInBattle` を dispatch 版に置き換えれば、テスト全体の安定性が向上する。

### 使い分け

| テスト対象 | 方式 |
|-----------|------|
| DnD の UI 操作自体をテストする spec | 案A（改善版 dragCardToZone） |
| DnD はテストの前提条件に過ぎない（セットアップ等） | 案B（dispatch バイパス） |
