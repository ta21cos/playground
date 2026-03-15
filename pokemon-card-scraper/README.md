# Pokemon Card Scraper

ポケモンカード公式サイト（pokemon-card.com）からカード情報を取得し、SQLite に保存するスクレイピングツールです。

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate.fish  # bash/zsh の場合: source .venv/bin/activate
pip install -r requirements.txt
```

依存パッケージ: `requests`, `beautifulsoup4`（どちらも Python 標準ライブラリ外、`sqlite3` は標準ライブラリ）

## 使い方

### カード ID を直接指定する

```bash
python scraper.py --ids 42083 42084 42085
```

### ファイルからカード ID を読み込む

```bash
python scraper.py -f card_ids.txt
```

### パック ID でまとめて取得する

```bash
# スカーレット ex のカードを全件取得
python scraper.py --pack 870

# 複数パックを一度に
python scraper.py --pack 907 913 914 917 918 922 923
```

検索 API（`resultAPI.php`）から該当パックのカード ID 一覧を自動取得し（1ページ39件、全ページ巡回）、各カードの詳細をスクレイピングします。

パック ID は公式サイトの検索ページ URL の `pg` パラメータで確認できます。

### 組み合わせ

```bash
python scraper.py --ids 42083 -f card_ids.txt --pack 870
```

`--ids`、`-f`、`--pack` はすべて併用可能です。指定されたカード ID が結合されます。

### オプション一覧

| オプション | 説明 | デフォルト |
|---|---|---|
| `--ids` | カード ID を直接指定（スペース区切りで複数可） | - |
| `-f`, `--file` | カード ID リストのファイルパス | - |
| `--pack` | パック ID を指定して全カードを取得（複数可） | - |
| `--db` | SQLite データベースのパス | `cards.db` |
| `--image-dir` | カード画像の保存先ディレクトリ（省略時はダウンロードしない） | - |
| `--min-sleep` | リクエスト間の最小待機時間（秒） | `3.0` |
| `--max-sleep` | リクエスト間の最大待機時間（秒） | `8.0` |

```bash
# 画像もダウンロードする例
python scraper.py --ids 42083 --image-dir images/

# スリープ間隔を調整する例
python scraper.py -f card_ids.txt --min-sleep 5 --max-sleep 10

# バックグラウンドでリアルタイム出力しながら実行する例
python -u scraper.py --pack 870 --min-sleep 3 --max-sleep 6
```

## カード ID 入力形式

### 直接指定（`--ids`）

スペース区切りでカード ID を並べます。

### ファイル指定（`-f`）

テキストファイルまたは CSV ファイルに対応しています。

```text
# コメント行（# で始まる行はスキップ）
42083
42084
42085
```

- 空行はスキップされます
- CSV の場合、各行の最初のカラムがカード ID として使われます

## データソース

### カード詳細ページ

各カードのデータは以下の URL パターンから HTML を取得し、BeautifulSoup でパースします。

```
https://www.pokemon-card.com/card-search/details.php/card/{card_id}/
```

### 検索 API（パック指定時）

`--pack` 指定時は検索 API からカード ID 一覧を取得します。

```
https://www.pokemon-card.com/card-search/resultAPI.php?pg={pack_id}&page={page}&regulation_sidebar_form=all&sm_and_keyword=true
```

レスポンスは JSON で、`cardList[].cardID` にカード ID、`maxPage` に総ページ数が含まれます（1ページ39件）。

## パック ID 一覧

`packs.txt` にレギュレーション別のパック ID リストを管理しています。

### 主要拡張パック

#### SV シリーズ

| pack_id | コード | パック名 |
|---|---|---|
| 870 | SV1S | スカーレットex |
| 871 | SV1V | バイオレットex |
| 877 | SV1a | トリプレットビート |
| 879 | SV2P | スノーハザード |
| 880 | SV2D | クレイバースト |
| 882 | SV2a | ポケモンカード151 |
| 894 | SV3 | 黒炎の支配者 |
| 897 | SV3a | レイジングサーフ |
| 901 | SV4K | 古代の咆哮 |
| 902 | SV4M | 未来の一閃 |
| 905 | SV4a | シャイニートレジャーex |
| 906 | SV5K | ワイルドフォース |
| 907 | SV5M | サイバージャッジ |
| 913 | SV5a | クリムゾンヘイズ |
| 914 | SV6 | 変幻の仮面 |
| 917 | SV6a | ナイトワンダラー |
| 918 | SV7 | ステラミラクル |
| 922 | SV7a | 楽園ドラゴーナ |
| 923 | SV8 | 超電ブレイカー |
| 934 | SV8a | テラスタルフェスex |
| 935 | SV9 | バトルパートナーズ |
| 940 | SV9a | 熱風のアリーナ |
| 941 | SV10 | ロケット団の栄光 |
| 942 | SV11B | ブラックボルト |
| 943 | SV11W | ホワイトフレア |

#### M シリーズ

| pack_id | コード | パック名 |
|---|---|---|
| 944 | M1L | メガブレイブ |
| 945 | M1S | メガシンフォニア |
| 949 | M2 | インフェルノX |
| 950 | M2a | MEGAドリームex |
| 952 | M3 | ムニキスゼロ |
| 953 | M4 | ニンジャスピナー |

#### プロモ

| pack_id | パック名 |
|---|---|
| SV-P | スカーレット＆バイオレット プロモカード |
| M-P | MEGA プロモカード |

## データベース

SQLite（デフォルト: `cards.db`）に以下のスキーマで保存されます。

```sql
CREATE TABLE cards (
    card_id       TEXT PRIMARY KEY,
    name          TEXT,
    card_category TEXT,
    data          TEXT NOT NULL,  -- 全フィールドを含む JSON
    image_path    TEXT,
    fetched_at    TEXT NOT NULL   -- ISO 8601 (UTC)
);
```

`data` カラムに全てのカード情報が JSON として格納されています。SQLite の JSON 関数で柔軟にクエリできます。

```bash
# 取得済みカード一覧
sqlite3 cards.db "SELECT card_id, name, card_category FROM cards"

# 取得済み件数
sqlite3 cards.db "SELECT COUNT(*) FROM cards"

# HP が 300 以上のポケモン
sqlite3 cards.db "SELECT card_id, name, json_extract(data, '$.hp') as hp FROM cards WHERE json_extract(data, '$.hp') >= 300"

# 特定のパックに収録されているカード
sqlite3 cards.db "SELECT card_id, name FROM cards WHERE json_extract(data, '$.packs') LIKE '%パック名%'"

# カードタイプ別の件数
sqlite3 cards.db "SELECT card_category, COUNT(*) FROM cards GROUP BY card_category"
```

### JSON に含まれるフィールド

#### 共通フィールド（全カードタイプ）

| フィールド | 型 | 説明 |
|---|---|---|
| `card_id` | string | カード ID（公式サイト内部 ID） |
| `name` | string | カード名 |
| `card_category` | string | カードタイプ（下記参照） |
| `image_url` | string | カード画像の URL |
| `regulation` | string | エキスパンションコード（例: SV1S, M4） |
| `card_number` | string | カード番号（例: `002/080`） |
| `rarity` | string | レアリティ（画像ファイル名から抽出、例: `rr`, `sr`, `sar`, `u_c`） |
| `illustrator` | string | イラストレーター名 |
| `packs` | object[] | 収録パックの一覧。各要素: `{name, url}` |
| `canonical_id` | string | ゲーム性能ベースの正規化 ID（16文字 hex）。アート違い・パック違いでも同じ値になる |
| `pokedex_info` | string | 図鑑情報（種類・高さ・重さなど、ポケモンのみ） |
| `flavor_text` | string | フレーバーテキスト（ポケモンのみ） |

#### `card_category` の値

| 値 | 説明 |
|---|---|
| `ポケモン` | ポケモンカード（たね、1進化、2進化、ex、V 等すべて含む） |
| `グッズ` | トレーナーズ — グッズ |
| `サポート` | トレーナーズ — サポート |
| `スタジアム` | トレーナーズ — スタジアム |
| `ポケモンのどうぐ` | トレーナーズ — ポケモンのどうぐ |
| `基本エネルギー` | 基本エネルギーカード |
| `特殊エネルギー` | 特殊エネルギーカード |

#### ポケモンカード固有フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `stage` | string | 進化段階（`たね`、`1 進化`、`2 進化`） |
| `hp` | int \| null | HP |
| `type` | string[] | タイプ（草、炎、水、雷、超、闘、悪、鋼、竜、フェアリー、無） |
| `abilities` | object[] | 特性の一覧。各要素: `{name, description}` |
| `moves` | object[] | ワザの一覧。各要素: `{name, energy_cost, damage, description}` |
| `weakness` | string | 弱点（例: `雷×2`） |
| `resistance` | string | 抵抗力（例: `草-30`、なしの場合 `--`） |
| `retreat_cost` | int | にげるコスト（エネルギーアイコンの数） |
| `evolutions` | object[] | 進化ライン。各要素: `{name, is_current}` |
| `special_rule` | string | 特別なルール（例: 「ポケモンexがきぜつしたとき、相手はサイドを2枚とる。」） |

#### トレーナーズカード固有フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `effect_text` | string | カードの効果テキスト |
| `rule_text` | string | 使用ルール（例: 「グッズは、自分の番に何枚でも使える。」） |
| `special_rule` | string | 特別なルール（ACE SPEC 等、該当しない場合は空文字） |

#### エネルギーカード固有フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `effect_text` | string | カードの効果テキスト（基本エネルギーでは空文字） |
| `special_rule` | string | 特別なルール（ACE SPEC 等、該当しない場合は空文字） |

### タイプ × フィールド対応表

`o` = 値あり、`-` = 空値/null/空配列

| フィールド | ポケモン | グッズ | サポート | スタジアム | どうぐ | 基本エネ | 特殊エネ |
|---|---|---|---|---|---|---|---|
| `stage` | o | - | - | - | - | - | - |
| `hp` | o | - | - | - | - | - | - |
| `type` | o | - | - | - | - | - | - |
| `abilities` | o | - | - | - | - | - | - |
| `moves` | o | - | - | - | - | - | - |
| `weakness` | o | - | - | - | - | - | - |
| `resistance` | o | - | - | - | - | - | - |
| `retreat_cost` | o | - | - | - | - | - | - |
| `evolutions` | o | - | - | - | - | - | - |
| `effect_text` | - | o | o | o | o | - | o |
| `rule_text` | - | o | o | o | o | - | - |
| `special_rule` | o* | o** | o** | o** | o** | - | o** |

`*` ex/V/VSTAR 等のみ、`**` ACE SPEC 等のみ

### BigQuery 向けスキーマ

BigQuery にロードする場合は、単一テーブル + nullable カラム構成が推奨です。カラムナーストレージのため null カラムはほぼコストゼロで、JOIN も不要です。

```sql
CREATE TABLE pokemon_cards.cards (
  -- 共通
  card_id         STRING NOT NULL,
  name            STRING,
  card_category   STRING,
  canonical_id    STRING,
  image_url       STRING,
  regulation      STRING,
  card_number     STRING,
  rarity          STRING,
  illustrator     STRING,
  packs           ARRAY<STRUCT<name STRING, url STRING>>,
  pokedex_info    STRING,
  flavor_text     STRING,

  -- ポケモン固有（トレーナーズ/エネルギーでは null）
  stage           STRING,
  hp              INT64,
  types           ARRAY<STRING>,
  abilities       ARRAY<STRUCT<name STRING, description STRING>>,
  moves           ARRAY<STRUCT<name STRING, energy_cost ARRAY<STRING>, damage STRING, description STRING>>,
  weakness        STRING,
  resistance      STRING,
  retreat_cost    INT64,
  evolutions      ARRAY<STRUCT<name STRING, is_current BOOL>>,

  -- トレーナーズ/エネルギー固有（ポケモンでは null）
  effect_text     STRING,
  rule_text       STRING,

  -- 共通（該当カードのみ）
  special_rule    STRING,

  -- メタ
  fetched_at      TIMESTAMP NOT NULL
);
```

## 画像ダウンロード

`--image-dir` を指定すると、カードデータ取得時に画像も一緒にダウンロードします。

- 保存先: `{image-dir}/{card_id}{拡張子}`（拡張子は元 URL から取得、不明な場合は `.jpg`）
- 画像ファイルが既に存在する場合はスキップされます
- ダウンロードに成功した場合、DB の `image_path` カラムにパスが記録されます
- ダウンロード失敗時は `image_path` は空文字になります（カードデータ自体は保存されます）
- 1枚あたり 50〜150KB（JPEG）、数千枚で数百 MB 程度

## レジューム機能

データベースに既に存在するカード ID は自動的にスキップされます。途中で中断（Ctrl+C）しても、同じコマンドを再実行すれば未取得のカードのみ取得します。

実行時にスキップ状況が表示されます:

```
Total IDs: 100, Already fetched: 42, Remaining: 58
```

## 負荷制御

対象サイトへの負荷を抑えるため、以下の制御が組み込まれています。

| 制御 | 詳細 |
|---|---|
| **リクエスト間隔** | `--min-sleep` 〜 `--max-sleep` 秒のランダムな待機（デフォルト: 3〜8秒） |
| **逐次処理** | 並列リクエストは行わず、1件ずつ順番に取得します |
| **リトライと指数バックオフ** | 429 / 5xx エラー時、最大3回まで指数バックオフでリトライ（5秒→10秒→20秒 + ランダム0〜3秒） |
| **タイムアウト** | 各リクエストに30秒のタイムアウトを設定 |
| **パック検索 API** | ページ間 1〜3秒のランダム待機 |

### エラー時の挙動

| ステータス | 挙動 |
|---|---|
| **404** | そのカードをスキップし、次のカードに進みます |
| **429 / 5xx** | 指数バックオフで最大3回リトライ。すべて失敗した場合はスキップ |
| **ネットワークエラー** | 同上（指数バックオフでリトライ） |

大量のカード ID を取得する場合は、スリープ間隔を長めに設定してください:

```bash
python scraper.py -f large_list.txt --min-sleep 5 --max-sleep 15
```

## canonical_id（カードの同一性）

同じカードでも、アート違い（通常/SAR/SR 等）やパック違い（本弾/再録）で異なる `card_id` が割り当てられています。`canonical_id` はゲーム性能に関わるフィールドのみから SHA-256 ハッシュで計算された正規化 ID（先頭16文字の hex）で、これらのバリエーションを同一カードとして扱えます。

**計算に使うフィールド（= ゲーム性能）:**
`name`, `card_category`, `stage`, `hp`, `type`, `abilities`, `moves`, `weakness`, `resistance`, `retreat_cost`, `effect_text`, `special_rule`

**計算に使わないもの（= バリエーション差分）:**
`card_id`, `card_number`, `rarity`, `illustrator`, `image_url`, `packs`, `regulation`, `pokedex_info`, `flavor_text`, `rule_text`

```bash
# 同一カードのバリエーション一覧
sqlite3 cards.db "
  SELECT canonical_id, COUNT(*) as variants, GROUP_CONCAT(card_id) as card_ids
  FROM cards
  GROUP BY canonical_id
  HAVING variants > 1
"

# ユニークなカード数
sqlite3 cards.db "SELECT COUNT(DISTINCT json_extract(data, '$.canonical_id')) FROM cards"
```

## タイプアイコンのマッピング

公式サイトの HTML では、ポケモンのタイプ・エネルギーコスト・弱点・抵抗力が CSS クラス名で表現されています。以下のマッピングで日本語タイプ名に変換しています。

| CSS クラス | タイプ |
|---|---|
| `icon-grass` | 草 |
| `icon-fire` | 炎 |
| `icon-water` | 水 |
| `icon-electric` / `icon-lightning` | 雷 |
| `icon-psychic` | 超 |
| `icon-fighting` | 闘 |
| `icon-dark` / `icon-darkness` | 悪 |
| `icon-steel` / `icon-metal` | 鋼 |
| `icon-dragon` | 竜 |
| `icon-fairy` | フェアリー |
| `icon-none` | 無 |
