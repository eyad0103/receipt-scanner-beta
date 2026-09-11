-- Migration: Initial schema for ReceiptFlow
-- Run with: wrangler d1 migrations apply receiptflow-db

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant TEXT,
  date TEXT,
  time TEXT,
  receipt_number TEXT,
  currency TEXT DEFAULT 'USD',
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL,
  discounts REAL DEFAULT 0,
  tax REAL,
  total REAL,
  payment_method TEXT,
  category TEXT,
  image_url TEXT,
  ocr_confidence REAL DEFAULT 0,
  ocr_provider TEXT DEFAULT 'tesseract',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);