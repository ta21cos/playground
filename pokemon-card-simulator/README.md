# ポケモンカード一人回し PWA

ポケモンカードの一人回し（ソロプレイ練習）をブラウザ上で行えるアプリ。デッキの回り具合（初手安定率、キーカード到達ターン、エネルギー供給テンポ）を自分で回して確認できる。

## セットアップ

```bash
# 依存パッケージのインストール
bun install

# カードデータのビルド（初回のみ — cards.db が必要）
bun run build:cards
```

### カードデータについて

`bun run build:cards` は `../pokemon-card-scraper/cards.db`（SQLite）からカードデータを読み取り、`src/data/cards.json` を生成する。cards.db は [pokemon-card-scraper](../pokemon-card-scraper/) で取得したもの。

## 開発

```bash
# 開発サーバー起動（http://localhost:5173）
bun run dev

# テスト実行
bun run test

# テスト（ウォッチモードなし）
bun vitest run

# TypeScript 型チェック
bunx tsc --noEmit

# プロダクションビルド
bun run build

# ビルド結果のプレビュー
bun run preview
```

## 技術スタック

| カテゴリ | ツール |
|---------|--------|
| フレームワーク | React 19 + TypeScript |
| ビルド | Vite 6 |
| テスト | Vitest + Testing Library |
| ドラッグ&ドロップ | dnd-kit |
| PWA | vite-plugin-pwa (Workbox) |
| ランタイム | Bun |

## プロジェクト構成

```
src/
├── components/      # React コンポーネント
│   ├── Card.tsx            # カード表示（画像 + フォールバック）
│   ├── GameBoard.tsx       # ゲーム盤面レイアウト
│   ├── Zone.tsx            # ゾーン表示
│   ├── DndProvider.tsx     # DnD コンテキスト
│   ├── DraggableCard.tsx   # ドラッグ可能カード
│   ├── DroppableZone.tsx   # ドロップ先ゾーン
│   ├── ActionBar.tsx       # ターン終了・Undo 等のボタン群
│   ├── ContextMenu.tsx     # カードタップメニュー
│   ├── SearchModal.tsx     # 山札サーチ UI
│   ├── HistoryPanel.tsx    # 操作履歴パネル
│   ├── BenchSelector.tsx   # ベンチ→バトル場選択 UI
│   ├── DeckImport.tsx      # デッキ入力 UI
│   └── OpponentSideCounter.tsx  # 相手サイドカウンター
├── data/
│   ├── basic-energies.ts   # 基本エネルギー 8 種（ハードコード）
│   ├── card-resolver.ts    # canonical_id によるカード解決
│   └── cards.json          # ビルド生成（.gitignore 対象）
├── domain/          # ドメインロジック（UI 非依存）
│   ├── game-setup.ts       # シャッフル・初期配布
│   ├── mulligan.ts         # マリガン判定・処理
│   ├── turn.ts             # ターン開始・終了・ドロー
│   ├── card-actions.ts     # サーチ・ドロー・山札戻し・サイド操作
│   ├── attachment.ts       # エネルギー・どうぐ付与
│   ├── attachment-cleanup.ts  # 付与カード自動トラッシュ・取り外し
│   ├── evolution.ts        # 進化・退化
│   ├── damage-counter.ts   # ダメカン管理
│   ├── stadium.ts          # スタジアム上書き
│   ├── battle-bench-swap.ts  # バトル場/ベンチ入れ替え
│   ├── zone-actions.ts     # ゾーン間移動・ベンチ枠増減
│   ├── deck-parser.ts      # テキスト形式デッキパーサー
│   ├── deck-serializer.ts  # JSON シリアライズ/デシリアライズ
│   ├── deck-validator.ts   # 60 枚バリデーション
│   ├── opponent-side.ts    # 相手サイドカウンター
│   ├── custom-setup.ts     # フリーセットアップモード
│   └── reset.ts            # ゲームリセット
├── store/
│   └── snapshot.ts         # スナップショット保存・復元
├── styles/
│   └── index.css           # グローバルスタイル
└── types/
    ├── card.ts             # カード型定義
    ├── deck.ts             # デッキ型定義
    ├── game-state.ts       # ゲーム状態・フェーズ
    └── zone.ts             # ゾーン定義

scripts/
└── build-cards-json.ts     # cards.db → JSON 変換

tests/
├── unit/
│   ├── actions/     # カード操作のテスト
│   ├── components/  # コンポーネントテスト
│   ├── data/        # データ層テスト
│   ├── game/        # ゲームフローテスト
│   ├── models/      # モデルテスト
│   └── state/       # 状態管理テスト
├── fixtures/        # テスト用カードデータ
└── helpers/         # テストヘルパー
```

## ゲームフロー

1. **デッキ読込** — テキスト形式のデッキリストをペースト、または JSON ファイルをインポート
2. **セットアップ** — シャッフル → 手札 7 枚配布 → マリガン判定
3. **配置** — たねポケモンをバトル場・ベンチに配置
4. **ゲーム開始** — サイド 6 枚配布 → ターン 1 ドロー
5. **プレイ** — カード操作（DnD、コンテキストメニュー、ゾーンタップ）
6. **ターン終了** → 自動ドロー → 次ターン

フリーセットアップモードでは手順 2-3 をスキップし、任意のカードを任意のゾーンに配置してゲームを開始できる。

## スコープ外

- HP 自動追跡・きぜつ自動判定
- 特殊状態（どく・やけど等）
- ルール強制（サポート 1 枚/ターン等）
- 統計・分析
- 対戦相手・AI
