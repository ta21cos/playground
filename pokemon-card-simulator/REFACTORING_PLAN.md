# リファクタリング計画: ロジック / UI 分離

> 作成日: 2026-03-23
> 更新日: 2026-03-26

## 完了済み

### Phase 1: Zustand Store 作成 ✅
- `src/store/game-store.ts` — ゲームロジック全操作を含む Zustand vanilla store
- `zustand/vanilla` の `createStore` + `StateCreator` パターン（React 非依存）
- 既存の `src/domain/*.ts` の純粋関数をそのまま活用する薄いラッパー
- 状態変更アクションは自動で Undo 用スナップショットを積む

### Phase 2: Store Unit テスト（TDD）✅
- `tests/unit/store/game-store.test.ts` — 58 テスト、全 FR カバー
- React なしで `store.getState().action()` → `store.getState().game` で検証
- カバー済み FR: 12, 12a, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 22, 25, 29, 30, 31, 32, 34, 35, 36, 37

### Phase 3: App.tsx の useReducer → Zustand 移行 ✅
- `appReducer` (40+ case) を削除
- `dispatch({ type: "MOVE_CARD", ... })` → `actions.moveCard(...)` に置き換え
- UI 状態 (`modal`, `contextMenu`, `loading`) は React の `useState` で管理
- 全 E2E テスト通過確認済み (68 passed, 9 skipped)

## 未着手

### Phase 4: コミット & プッシュ
- 変更ファイル: `src/store/game-store.ts`, `src/App.tsx`, `tests/unit/store/game-store.test.ts`, `package.json` (zustand追加)
- DnD テスト安定化: `tests/e2e/helpers.ts` (dragCardToZone 改善), `tests/e2e/dnd-comprehensive.spec.ts` (新規)

### Phase 5: Store の importDeck 整理
- 現状: store 内の `importDeck` はテスト用の簡易パーサー。実際の App.tsx では `parseDeckList + CardResolver` を App 側に書いている
- 目標: `CardResolver` を store に注入可能にし、テスト時はモック、本番時は実 resolver を使う
- 方法: `createGameStore` に `resolver` パラメータを追加するか、store 外で解決してから `setGame` で渡す

### Phase 6: E2E テストの方針転換
- 現状: E2E テストはユーザー操作（クリック、DnD）をシミュレーションして結果を検証
- 目標: 「事前に state を与えて、それが HTML として適切に描画されるか」を検証するスタイルに変える
- 方法:
  1. `window.__TEST_API__` で store を公開（`import.meta.env.DEV` 限定）
  2. `page.evaluate` で store の state を直接セット
  3. DOM の描画結果のみを検証（ゾーンのカード枚数、バッジ表示、ボタン状態など）
- DnD 操作自体のテストは `dnd-comprehensive.spec.ts` に集約し、他のテストは store 操作 + 描画検証に特化

### Phase 7: 旧 Unit テスト整理
- `tests/unit/actions/` (7ファイル) — domain 関数の直接テスト。store テストと重複する部分あり
- `tests/unit/game/` (6ファイル) — ゲーム進行のテスト。store テストに統合済み
- `tests/unit/models/`, `tests/unit/data/`, `tests/unit/state/` — 型・データ・スナップショットのテスト。独立して有用
- 方針: domain 関数のテストは store テストに統合し、domain 固有のエッジケースのみ残す

## アーキテクチャ

```
テスト側:
  tests/unit/store/game-store.test.ts  ← ロジック全体のテスト（React 不要）
  tests/e2e/*.spec.ts                  ← UI 描画テスト（state → HTML）
  tests/e2e/dnd-comprehensive.spec.ts  ← DnD 操作テスト（ブラウザイベント）

プロダクション側:
  src/store/game-store.ts    ← Zustand store（状態 + 全操作メソッド）
    └─ src/domain/*.ts       ← 純粋関数（store から呼ばれる）
  src/App.tsx                ← React UI（store を購読して描画）
    └─ src/components/*.tsx  ← プレゼンテーションコンポーネント
```
