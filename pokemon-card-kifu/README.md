# pokemon-card-kifu

ポケモンカード対戦の棋譜を自動生成する CLI ツール。
各ターン終了時の盤面スナップショット（静止画）を入力として、前ターンとの差分から棋譜テキストを出力する。

## 技術スタック

- Python 3.12+ / uv
- OpenCV（画像処理・ゾーン切り出し）
- imagehash（pHash による変化検出）
- Gemini 2.5 Flash（カード識別）
- Pydantic（型定義・バリデーション）

## 現在のステータス

### 実装済み

- [x] Pydantic モデル定義（盤面状態・差分・棋譜エントリ等）
- [x] JSON 設定読み込み（ゾーン座標・デッキリスト）
- [x] 画像処理（ゾーン切り出し・pHash 計算・変化検出）
- [x] pHash ベースの識別キャッシュ
- [x] Gemini API 連携（バッチ識別）
- [x] 盤面差分検出
- [x] 棋譜テキスト生成
- [x] CLI 統合（`python -m kifu`）
- [x] ゾーン座標設定エディタ（`tools/zone_editor.html`）
- [x] ユニットテスト（22 テスト通過）

### 未実装・次のステップ

- [ ] カード参照画像の取得（`pokemon-card-scraper` を活用）
- [ ] 参照画像付き Gemini プロンプトの実装
- [ ] 動画からのフレーム抽出
- [ ] ゾーン座標の微調整
- [ ] E2E テスト

## セットアップ

```bash
uv sync
echo 'GEMINI_API_KEY=your-key' > .env
```

## 使い方

```bash
# 棋譜生成
uv run python -m kifu \
  --deck1 deck_p1.json --deck2 deck_p2.json \
  --zones zones.json \
  -o game_kifu.txt \
  turn_00.jpg turn_01.jpg turn_02.jpg ...

# ゾーン座標設定
open tools/zone_editor.html
```

## 出力例

```
■ ターン1（P1）
  P1 ベンチ2: - → ライチュウ
  P1 バトル場: ピカチュウex → ライチュウ
  スタジアム: - → ボウルタウン

■ ターン2（P2）
  P2 サイド: 6枚 → 5枚
```

## 開発

```bash
uv run pytest           # テスト
uv run pyright src/     # 型チェック
uv run ruff check src/  # リント
```
