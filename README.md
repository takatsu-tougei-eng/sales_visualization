# sales_visualization
Storesの売上の可視化


╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Plan to implement                                                                                                    │
│                                                                                                                      │
│ STORES 売上可視化ダッシュボード - 実装計画                                                                           │
│                                                                                                                      │
│ Context                                                                                                              │
│                                                                                                                      │
│ 陶芸体験教室（手回しロクロ・電動ロクロ）の売上をSTORES APIから取得し可視化する個人用ダッシュボード。                 │
│ APIトークン未取得のため、まずCSV取り込み→SQLite→ダッシュボード表示のパイプラインを構築する。                         │
│ API連携は将来トークン取得後に追加。                                                                                  │
│                                                                                                                      │
│ プロジェクト構成                                                                                                     │
│ sales_visualization/                                                                                                 │
│ ├── src/                                                                                                             │
│ │   ├── app/                                                                                                         │
│ │   │   ├── page.tsx              # ダッシュボード（4グラフ）                                                        │
│ │   │   ├── layout.tsx            # ルートレイアウト                                                                 │
│ │   │   ├── globals.css           # スタイル                                                                         │
│ │   │   └── api/                                                                                                     │
│ │   │       └── orders/                                                                                              │
│ │   │           └── route.ts      # 日別集計データAPI                                                                │
│ │   ├── lib/                                                                                                         │
│ │   │   ├── db.ts                 # SQLite接続・クエリ                                                               │
│ │   │   └── types.ts              # 型定義                                                                           │
│ │   └── components/                                                                                                  │
│ │       └── SalesChart.tsx         # Rechartsグラフコンポーネント                                                    │
│ ├── scripts/                                                                                                         │
│ │   └── import-csv.ts             # CSV取り込みスクリプト                                                            │
│ ├── data/                          # SQLite DB格納（gitignore）                                                      │
│ ├── .env.example                                                                                                     │
│ ├── package.json                                                                                                     │
│ ├── tsconfig.json                                                                                                    │
│ └── next.config.ts                                                                                                   │
│                                                                                                                      │
│ Step 1: Next.js プロジェクト初期化                                                                                   │
│                                                                                                                      │
│ - npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir                                      │
│ - 依存追加: better-sqlite3, @types/better-sqlite3, recharts, iconv-lite, csv-parse, tsx                              │
│ - .gitignore に data/ と *.csv を追加                                                                                │
│ - .env.example 作成（将来のOAuthトークン用テンプレート）                                                             │
│                                                                                                                      │
│ Step 2: SQLite DB セットアップ                                                                                       │
│                                                                                                                      │
│ ファイル: src/lib/db.ts                                                                                              │
│ CREATE TABLE IF NOT EXISTS orders (                                                                                  │
│   id INTEGER PRIMARY KEY AUTOINCREMENT,                                                                              │
│   order_number TEXT NOT NULL UNIQUE,  -- 重複取り込み防止                                                            │
│   order_date TEXT NOT NULL,            -- 'YYYY-MM-DD'                                                               │
│   item_name TEXT NOT NULL,             -- 元のアイテム名                                                             │
│   item_type TEXT NOT NULL,             -- '手回しロクロ' | '電動ロクロ'                                              │
│   time_slot TEXT NOT NULL,             -- '第1部' 等                                                                 │
│   quantity INTEGER NOT NULL,                                                                                         │
│   subtotal INTEGER NOT NULL                                                                                          │
│ );                                                                                                                   │
│                                                                                                                      │
│ CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);                                                    │
│ CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(item_type);                                                     │
│                                                                                                                      │
│ - order_number を UNIQUE にし、同じCSVを再取り込みしてもエラーにならないよう INSERT OR IGNORE                        │
│ - DB ファイルは data/sales.db                                                                                        │
│                                                                                                                      │
│ Step 3: CSV取り込みスクリプト                                                                                        │
│                                                                                                                      │
│ ファイル: scripts/import-csv.ts                                                                                      │
│                                                                                                                      │
│ - npm run import -- path/to/file.csv で実行（package.json に script 追加）                                           │
│ - 実行は tsx scripts/import-csv.ts                                                                                   │
│ - 処理フロー:                                                                                                        │
│   a. ファイルを iconv-lite で Shift_JIS → UTF-8 変換                                                                 │
│   b. csv-parse でパース                                                                                              │
│   c. アイテム名から item_type と time_slot を正規表現で抽出                                                          │
│       - /手回しロクロ体験/ → item_type = '手回しロクロ'                                                              │
│     - /電動ロクロ体験/ → item_type = '電動ロクロ'                                                                    │
│     - /第(\d+)部/ → time_slot = '第N部'                                                                              │
│   d. INSERT OR IGNORE でSQLiteに挿入                                                                                 │
│   e. 取り込み件数を表示                                                                                              │
│                                                                                                                      │
│ Step 4: API Route                                                                                                    │
│                                                                                                                      │
│ ファイル: src/app/api/orders/route.ts                                                                                │
│                                                                                                                      │
│ - GET /api/orders → 日別×商品別の集計データを返す                                                                    │
│ - クエリ:                                                                                                            │
│ SELECT                                                                                                               │
│   order_date,                                                                                                        │
│   item_type,                                                                                                         │
│   time_slot,                                                                                                         │
│   SUM(quantity) as total_quantity,                                                                                   │
│   SUM(subtotal) as total_amount                                                                                      │
│ FROM orders                                                                                                          │
│ WHERE order_date >= '2026-02-12'                                                                                     │
│ GROUP BY order_date, item_type, time_slot                                                                            │
│ ORDER BY order_date                                                                                                  │
│ - レスポンス: { data: Array<{ order_date, item_type, time_slot, total_quantity, total_amount }> }                    │
│                                                                                                                      │
│ Step 5: ダッシュボード UI                                                                                            │
│                                                                                                                      │
│ ファイル: src/components/SalesChart.tsx                                                                              │
│                                                                                                                      │
│ - 再利用可能なグラフコンポーネント（Recharts LineChart）                                                             │
│ - Props: title, data, lines（色・キー定義）, yAxisLabel                                                              │
│                                                                                                                      │
│ ファイル: src/app/page.tsx                                                                                           │
│                                                                                                                      │
│ - /api/orders からデータ fetch                                                                                       │
│ - データを種類別に分離・ピボット変換（日付を行、各部をカラムに）                                                     │
│ - 4つの SalesChart を配置:                                                                                           │
│   a. 手回しロクロ 売上金額推移                                                                                       │
│   b. 手回しロクロ 注文件数推移                                                                                       │
│   c. 電動ロクロ 売上金額推移                                                                                         │
│   d. 電動ロクロ 注文件数推移                                                                                         │
│ - Tailwind CSS でレイアウト                                                                                          │
│                                                                                                                      │
│ Step 6: 仕上げ                                                                                                       │
│                                                                                                                      │
│ - .env.example にOAuthトークン用の変数名を記載                                                                       │
│ - .gitignore に data/, *.csv 追加確認                                                                                │
│ - 動作確認手順を README に記載                                                                                       │
│                                                                                                                      │
│ 検証手順                                                                                                             │
│                                                                                                                      │
│ 1. npm run import -- test.csv でCSV取り込み → 件数表示を確認                                                         │
│ 2. npm run dev でNext.js起動                                                                                         │
│ 3. http://127.0.0.1:3000 でダッシュボード表示確認                                                                    │
│ 4. 4つのグラフが日別データで正しく描画されることを確認                                                               │
│ 5. 同じCSVの再取り込みで重複が発生しないことを確認                                                                   │
│ C:\Users\yoichiro\AppData\Local\Temp\claude\sales_visualization.sh (ctrl+y to copy)                                  │
│ C:\Users\yoichiro\AppData\Local\Temp\claude\CREATE-TABLE-IF.sh (ctrl+y to copy)                                      │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
