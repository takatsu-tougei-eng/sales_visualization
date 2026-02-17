import Database from "better-sqlite3";
import path from "path";
import type { DailySummary } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "sales.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
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
  }
  return db;
}

export function getDailySummary(): DailySummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        order_date,
        item_type,
        time_slot,
        SUM(quantity) as total_quantity,
        SUM(subtotal) as total_amount
      FROM orders
      WHERE order_date >= '2026-02-12'
      GROUP BY order_date, item_type, time_slot
      ORDER BY order_date
    `
    )
    .all();
  return rows as DailySummary[];
}
