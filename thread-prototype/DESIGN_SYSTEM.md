# Design System — Thread Prototype

ボタン・フォント・余白の統一ルール。
shadcn/ui + Tailwind v4 ベース。

---

## 1. Button Sizes

### 使い分けルール

| 用途 | size prop | className 追加 | 例 |
|------|-----------|----------------|-----|
| ツールバー内アイコン (hover で出る操作群) | `icon-xs` | — | Reply, Edit, Delete, Emoji |
| 独立アイコン (常時表示) | `icon-sm` | — | Inbox 削除, Send, Close panel |
| テキスト付き小ボタン | `sm` | — | Select, Cancel, "To Note" |
| 主要アクション | `(default)` | — | Save, Create, Promote |
| 大きめアクション (ページ上部 CTA) | `lg` | — | (現状未使用。将来用) |

### 禁止パターン

```tsx
// NG: size="icon" + className でサイズ上書き
<Button size="icon" className="h-6 w-6">

// OK: 適切な size variant を使う
<Button size="icon-xs">  // → 28px (size-7)
<Button size="icon-sm">  // → 32px (size-8)
<Button size="icon">     // → 36px (size-9)
```

```tsx
// NG: size="sm" に text-xs を追加 (sm は既に text-sm 相当)
<Button size="sm" className="text-xs gap-1">

// OK: xs を使う
<Button size="xs">  // → h-7, text-xs, gap-1
```

### アイコンサイズ対応表

| Button size | 内部 SVG サイズ (自動適用) | 明示する場合 |
|-------------|--------------------------|-------------|
| `icon-xs` / `xs` | `size-3.5` (14px) / `size-3` (12px) | `h-3.5 w-3.5` / `h-3 w-3` |
| `icon-sm` / `sm` | `size-4` (16px) | `h-4 w-4` |
| `icon` / `(default)` | `size-4` (16px) | `h-4 w-4` |
| `icon-lg` / `lg` | `size-4` (16px) | `h-4 w-4` |

---

## 2. Font Size Scale

### テキスト階層

| レベル | Tailwind class | 使用箇所 |
|--------|---------------|----------|
| **Display** | `text-2xl font-bold` | ノートタイトル入力 |
| **Page Heading** | `text-xl font-semibold` | ページ見出し ("Edit Note", "Inbox") |
| **Section Heading** | `text-lg font-semibold` | セクション見出し ("Threads" ロゴ) |
| **Card Title** | `text-sm font-medium` | カード/リストアイテムのタイトル |
| **Body** | `text-sm` | 本文、ナビゲーション、ラベル |
| **Caption** | `text-xs text-muted-foreground` | タイムスタンプ、メタ情報、バッジ、ステータスバッジ |

### ルール

- **本文テキストは `text-sm`** (14px) をデフォルトとする
- **`text-xs` は 13px** にテーマでオーバーライド済み (Tailwind デフォルト 12px → 13px)
- `text-base` (16px) は原則使わない (shadcn/ui のデフォルトが 14px ベース)
- `text-[10px]` 等の arbitrary value は使わない — 最小は `text-xs` (13px)
- **font-weight は 3 段階**: `font-bold` (見出し) / `font-semibold` (小見出し) / `font-medium` (強調ラベル)
- タイムスタンプ・メタ情報は必ず `text-xs text-muted-foreground`

---

## 3. Spacing Scale

### 余白トークン (8px グリッド基準)

| 名前 | Tailwind | px | 使用箇所 |
|------|----------|----|----------|
| **2xs** | `0.5` | 2px | ツールバーボタン間 gap |
| **xs** | `1` | 4px | リストアイテム内の微調整 |
| **sm** | `2` | 8px | コンポーネント内パディング、アイテム間 gap |
| **md** | `3` | 12px | カードパディング、セクション内 gap |
| **lg** | `4` | 16px | セクション間、フォームフィールド間 |
| **xl** | `6` | 24px | ページセクション間 |
| **2xl** | `8` | 32px | ページ最外周パディング |

### コンテナパディング

| コンテナ種別 | パディング | 例 |
|-------------|-----------|-----|
| ページ全体 | `p-6` | layout の main 領域 |
| カード / ボーダー付きアイテム | `p-4` | InboxItem |
| メッセージアイテム | `px-3 py-2` | MessageItem |
| サイドバーセクションヘッダ | `px-4 py-3` | "Channels", "Notes" |
| サイドバーナビアイテム | `px-2 py-2` | チャンネルリンク、ノートリンク |
| ツールバー | `p-0.5 gap-0.5` | メッセージホバーアクション |

### リスト間隔

| 密度 | class | 使用箇所 |
|------|-------|---------|
| **Dense** | `space-y-0.5` | サイドバーリスト (チャンネル、ノート) |
| **Default** | `space-y-2` | カードリスト (Inbox, Notes) |
| **Form** | `space-y-4` | フォームフィールド間 |
| **Section** | `space-y-6` | フォームセクション間 |

### Sticky バー

| 位置 | class |
|------|-------|
| 上部 sticky | `sticky top-0 z-10 border-b bg-background/80 px-3 py-1 backdrop-blur-sm` |
| 下部 sticky (選択バー) | `sticky bottom-0 border-t bg-background px-4 py-2 shadow-md` |

---

## 4. Textarea

| 用途 | min-height | rows |
|------|-----------|------|
| メッセージ入力 (1行スタート) | `min-h-[44px]` | `1` |
| メッセージ編集 (インライン) | `min-h-[60px]` | — |
| ノート本文 (フルエディタ) | `min-h-[50vh]` | — |

---

## 5. 固定幅

| 要素 | 幅 | 備考 |
|------|-----|------|
| サイドバー | `w-64` (256px) | desktop のみ表示 |
| スレッドパネル | `w-96` (384px) | desktop / mobile は Sheet |
| ノートエディタ | `max-w-3xl` (768px) | `mx-auto` で中央寄せ |
| ヘッダー高さ | `h-14` (56px) | サイドバー / モバイルヘッダー共通 |

---

## 6. アイコンサイズ

| 用途 | class | px |
|------|-------|----|
| バッジ内アイコン | `h-2.5 w-2.5` | 10px |
| インラインメタアイコン | `h-3 w-3` | 12px |
| サイドバーナビアイコン | `h-3.5 w-3.5` — `h-4 w-4` | 14-16px |
| ボタン内標準アイコン | `h-4 w-4` | 16px |
| 空状態アイコン | `h-10 w-10` — `h-12 w-12` | 40-48px |

---

## 7. Quick Reference — コピペ用

```tsx
// ツールバー内アイコンボタン
<Button variant="ghost" size="icon-xs" aria-label="..." title="...">
  <Icon className="h-3 w-3" />
</Button>

// 独立アイコンボタン (常時表示)
<Button variant="ghost" size="icon-sm" aria-label="..." title="...">
  <Icon className="h-4 w-4" />
</Button>

// テキスト付き小ボタン
<Button variant="ghost" size="xs">
  <Icon className="h-3 w-3" />
  Label
</Button>

// セクションヘッダー
<div className="flex items-center justify-between px-4 py-3">
  <span className="text-sm font-medium text-muted-foreground">Section</span>
</div>

// サイドバーナビアイテム
<Link className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
  <Icon className="h-4 w-4" />
  Label
</Link>

// タイムスタンプ
<span className="text-xs text-muted-foreground">{time}</span>

// バッジ (小)
<span className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-medium">
  <Icon className="h-2.5 w-2.5" />
  label
</span>
```
