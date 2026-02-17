import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { decode } from "iconv-lite";
import { parse } from "csv-parse/sync";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "sales.db");

function initDb(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      order_date TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(item_type);
  `);
  return db;
}

function extractItemType(itemName: string): string {
  if (/手回しロクロ/.test(itemName)) return "手回しロクロ";
  if (/電動ロクロ/.test(itemName)) return "電動ロクロ";
  if (/陶芸体験ワークショップ/.test(itemName)) return "陶芸WS";
  if (/実演＆対話ワークショップ|実演&対話ワークショップ/.test(itemName))
    return "実演＆対話WS";
  return "その他";
}

function extractTimeSlot(itemName: string): string {
  const match = itemName.match(/第(\d+)部/);
  return match ? `第${match[1]}部` : "不明";
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npm run import -- <path/to/file.csv>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath);
  const text = decode(raw, "cp932");

  const records: string[][] = parse(text, {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
  });

  const header = records[0];
  const dataRows = records.slice(1);

  const db = initDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO orders (order_number, order_date, item_name, item_type, time_slot, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;

  const insertMany = db.transaction((rows: string[][]) => {
    for (const row of rows) {
      const orderNumber = row[0]; // オーダー番号
      const status = row[1]; // ステータス
      const orderDatetime = row[3]; // オーダー日
      const itemName = row[8]; // アイテム名
      const quantity = parseInt(row[12], 10); // 個数
      const subtotal = parseInt(row[13], 10); // 小計

      if (status !== "完了") {
        skipped++;
        continue;
      }

      const orderDate = orderDatetime.split(" ")[0]; // 'YYYY-MM-DD'
      const itemType = extractItemType(itemName);
      const timeSlot = extractTimeSlot(itemName);

      const result = insert.run(
        orderNumber,
        orderDate,
        itemName,
        itemType,
        timeSlot,
        quantity,
        subtotal
      );
      if (result.changes > 0) {
        imported++;
      } else {
        skipped++;
      }
    }
  });

  insertMany(dataRows);

  console.log(`CSV: ${path.basename(resolvedPath)}`);
  console.log(`  全行数: ${dataRows.length}`);
  console.log(`  取込済: ${imported}`);
  console.log(`  スキップ(重複/返金等): ${skipped}`);
}

main();
