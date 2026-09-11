import type { D1Database } from '@cloudflare/workers-types';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  merchant: string | null;
  date: string | null;
  time: string | null;
  receipt_number: string | null;
  currency: string;
  items: string; // JSON string
  subtotal: number | null;
  discounts: number;
  tax: number | null;
  total: number | null;
  payment_method: string | null;
  category: string | null;
  image_url: string | null;
  ocr_confidence: number;
  ocr_provider: string;
  created_at: string;
  updated_at: string;
}

export class Database {
  constructor(private db: D1Database) {}

  // Users
  async createUser(user: Omit<User, 'created_at'>): Promise<void> {
    await this.db.prepare(
      'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)'
    ).bind(user.id, user.email, user.name, user.password_hash).run();
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  }

  // Receipts
  async createReceipt(receipt: Omit<Receipt, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO receipts (id, user_id, merchant, date, time, receipt_number, currency, items, subtotal, discounts, tax, total, payment_method, category, image_url, ocr_confidence, ocr_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      receipt.id, receipt.user_id, receipt.merchant, receipt.date, receipt.time,
      receipt.receipt_number, receipt.currency, receipt.items, receipt.subtotal,
      receipt.discounts, receipt.tax, receipt.total, receipt.payment_method,
      receipt.category, receipt.image_url, receipt.ocr_confidence, receipt.ocr_provider,
      now, now
    ).run();
  }

  async getReceipts(userId: string, limit = 50, offset = 0): Promise<Receipt[]> {
    return this.db.prepare(`
      SELECT * FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all<Receipt>().then(r => r.results);
  }

  async getReceipt(id: string, userId: string): Promise<Receipt | null> {
    return this.db.prepare('SELECT * FROM receipts WHERE id = ? AND user_id = ?').bind(id, userId).first<Receipt>();
  }

  async updateReceipt(id: string, userId: string, updates: Partial<Receipt>): Promise<void> {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
    if (fields.length === 0) return;
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);
    values.push(new Date().toISOString()); // updated_at
    values.push(id);
    values.push(userId);
    
    await this.db.prepare(`UPDATE receipts SET ${setClause}, updated_at = ? WHERE id = ? AND user_id = ?`).bind(...values).run();
  }

  async deleteReceipt(id: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM receipts WHERE id = ? AND user_id = ?').bind(id, userId).run();
    return (result.meta?.changes ?? 0) > 0;
  }
}