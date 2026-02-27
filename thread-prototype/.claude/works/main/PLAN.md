# Plan: Flow×Stock PKM App — Phase 1 (Prototype)

## Goal

Slackライクなチャンネルベースのフロー管理を個人用に実現する。
ローカルで動くプロトタイプ。Next.js Server Actions + SQLite。

## PR Chain

> Total: 4 PRs
> Dependency Graph: PR1 → PR2 → PR3 → PR4 (linear chain)
> Schema: 各PRで必要なテーブルをインクリメンタルに追加（PR1で全スキーマ定義しない）

### PR 1/4: Foundation — プロジェクトセットアップ + チャンネル管理

- **Pattern:** Foundation First
- **Branch:** feat/foundation-channels
- **Base:** main
- **Scope:** FR-1, FR-2, FR-3, FR-4, NFR-1(基本レイアウト), NFR-2
- **Depends on:** (none)
- **Releasable alone:** Yes — チャンネルの作成・一覧・編集・削除ができるアプリとして機能する
- **Files:**
  - `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
  - `drizzle.config.ts`
  - `src/db/schema.ts` — channels テーブルのみ
  - `src/db/index.ts` — DB接続 singleton + WAL mode
  - `src/app/layout.tsx` — ルートレイアウト（レスポンシブ対応サイドバー + メインエリア）
  - `src/app/page.tsx` — ホームページ
  - `src/app/channels/[channelId]/page.tsx` — チャンネル詳細ページ（空シェル）
  - `src/components/sidebar.tsx` — サイドバー（チャンネル一覧、モバイル対応）
  - `src/components/channel-create-dialog.tsx`
  - `src/components/channel-edit-dialog.tsx`
  - `src/actions/channels.ts` — Server Actions（CRUD, CASCADE DELETE）
  - `components.json`
- **Steps:**
  1. `npx create-next-app@latest` でプロジェクト初期化（App Router, Tailwind, TypeScript）
  2. shadcn/ui をインストール・設定
  3. Drizzle ORM + better-sqlite3 をインストール
  4. `next.config.ts` に `serverExternalPackages: ['better-sqlite3']` 追加
  5. DB singleton パターン実装（`globalThis.__db` でHMR対応、WAL mode有効化）
  6. channels テーブルのスキーマ定義 + マイグレーション
  7. レスポンシブ対応サイドバーレイアウト実装（モバイル: ハンバーガーメニュー）
  8. チャンネル CRUD Server Actions 実装（削除時は関連データ CASCADE DELETE）
  9. チャンネル一覧表示・作成・編集・削除 UI + 空状態の表示
- **Technical Notes:**
  - DB path: `path.join(process.cwd(), 'data', 'local.db')` — `.next/` 外に固定
  - 初期動作確認: throwaway route で DB 接続テスト

### PR 2/4: Messages — メッセージ投稿 + Markdown + タイムライン

- **Pattern:** Layer by Layer
- **Branch:** feat/messages
- **Base:** feat/foundation-channels
- **Scope:** FR-5, FR-6, FR-7, FR-8, NFR-3
- **Depends on:** PR 1
- **Releasable alone:** Yes — チャンネルにメッセージを投稿・表示できるSlackライクな体験が完成
- **Files:**
  - `src/db/schema.ts` — messages テーブル追加
  - `src/app/channels/[channelId]/page.tsx` — メッセージタイムライン
  - `src/components/message-list.tsx`
  - `src/components/message-item.tsx` — Markdown表示 + 編集・削除
  - `src/components/message-input.tsx` — 入力フォーム（Cmd+Enter送信）
  - `src/components/markdown-renderer.tsx` — react-markdown + remark-gfm（rehype-raw は使わない）
  - `src/actions/messages.ts`
- **Steps:**
  1. react-markdown + remark-gfm をインストール
  2. messages テーブルスキーマ追加 + マイグレーション
  3. メッセージ CRUD Server Actions 実装
  4. メッセージタイムライン表示（時系列、新しいものが下、自動スクロール）
  5. Markdown インラインレンダリング（rehype-raw 不使用でXSS防止）
  6. メッセージ入力フォーム（Cmd+Enter で送信）
  7. メッセージ編集・削除 UI
  8. 空チャンネル（メッセージなし）の表示

### PR 3/4: Threads + Reactions — スレッド返信 + 絵文字リアクション

- **Pattern:** Vertical Slice
- **Branch:** feat/threads-reactions
- **Base:** feat/messages
- **Scope:** FR-9, FR-10, FR-11, FR-12
- **Depends on:** PR 2
- **Releasable alone:** Yes — 既存メッセージ機能への追加
- **Files:**
  - `src/db/schema.ts` — thread_messages, reactions テーブル追加
  - `src/components/thread-panel.tsx` — スレッドサイドパネル
  - `src/components/message-item.tsx` — リアクション表示、スレッド開くボタン追加
  - `src/components/emoji-picker.tsx` — 絵文字ピッカー（カスタム実装、軽量）
  - `src/components/emoji-suggest.tsx` — `:記法` サジェスト
  - `src/components/message-input.tsx` — `:記法` サジェスト統合
  - `src/actions/threads.ts` — スレッド返信 CRUD（編集・削除含む）
  - `src/actions/reactions.ts`
- **Steps:**
  1. thread_messages + reactions テーブルスキーマ追加
  2. スレッド返信 CRUD Server Actions（作成・編集・削除）
  3. スレッドサイドパネル UI（URL search params `?thread=<id>` でディープリンク対応）
  4. リアクション追加・削除 Server Actions
  5. 絵文字ピッカー UI（カスタム実装: 静的な絵文字マップ + フィルタ、ライブラリ不使用）
  6. `:記法` サジェスト（`onKeyDown` で `:` 検知 → ポップオーバー表示）
  7. レスポンシブ対応: モバイルではスレッドパネルをフルスクリーン or Sheet
- **Technical Notes:**
  - 絵文字ピッカー: emoji-mart等のライブラリは使わず、curated ~100 emoji の静的マップで実装（軽量・SSR問題なし）
  - スレッドパネル開閉: URL params で管理しServer/Client境界を越えやすくする

### PR 4/4: Search + Calendar — 全文検索 + カレンダービュー

- **Pattern:** Vertical Slice
- **Branch:** feat/search-calendar
- **Base:** feat/threads-reactions
- **Scope:** FR-13, FR-14, FR-15, FR-16
- **Depends on:** PR 3（ベースブランチ）
- **Releasable alone:** Yes — 検索とカレンダーは既存機能への追加
- **Files:**
  - `src/db/fts.ts` — FTS5 仮想テーブル + trigram tokenizer セットアップ（raw SQL）
  - `src/db/index.ts` — FTS5 初期化を起動時に実行
  - `src/components/search-modal.tsx` — Cmd+K 検索モーダル（shadcn Command）
  - `src/components/search-results.tsx` — 検索結果表示
  - `src/components/calendar-view.tsx` — 1ヶ月カレンダー（カスタム実装、ライブラリ不使用）
  - `src/app/channels/[channelId]/page.tsx` — カレンダービュー統合
  - `src/actions/search.ts`
- **Steps:**
  1. FTS5 仮想テーブル作成（`CREATE VIRTUAL TABLE IF NOT EXISTS` で冪等、trigram tokenizer）
  2. SQLite TRIGGER で messages INSERT/UPDATE/DELETE 時に FTS インデックス自動同期
  3. 既存データの FTS リビルド（`INSERT INTO messages_fts(messages_fts) VALUES('rebuild')`）
  4. 全文検索 Server Action（raw SQL、Drizzle の `sql` テンプレート使用）
  5. Cmd+K グローバル検索モーダル（shadcn `CommandDialog` + debounce）
  6. 検索結果から元メッセージへのジャンプ（チャンネルページ + スクロール）
  7. カレンダービュー（42セルグリッド、`SELECT DATE(created_at), COUNT(*) GROUP BY` でドット表示）
- **Technical Notes:**
  - FTS5 は Drizzle 非対応 → raw SQL で管理、`instrumentation.ts` or DB初期化時に実行
  - trigram tokenizer: 日本語の分かち書き不要、部分文字列検索で十分な精度
  - カレンダー: FullCalendar等は不使用、~100行のカスタム実装

## Premortem

| リスク | 影響度 | 発生確率 | 復旧方法 |
|--------|--------|----------|----------|
| better-sqlite3 が Next.js HMR でクラッシュ | High | Medium | `globalThis.__db` singleton + `serverExternalPackages` 設定 |
| SQLite FTS5 の日本語検索精度が低い | Medium | Low | trigram tokenizer で部分文字列検索（十分実用的） |
| Drizzle ORM の FTS5 非対応 | Medium | Certain | FTS5 は raw SQL で管理、通常テーブルのみ Drizzle |
| shadcn/ui と Tailwind v4 のバージョン不整合 | Low | Medium | Tailwind v3 にピン or shadcn CLI が自動検出 |

## Constraints

- Next.js Server Actions のみ使用（API Routes は使わない）
- 外部サービス依存なし（すべてローカル完結）
- プロトタイプ品質（エラーハンドリングは最低限）
- 自動テストは Phase 1 では書かない（明示的判断）
- rehype-raw は使わない（XSS防止）
