import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { log } from '../logging/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'receiptflow.db');

let db: any = null;

export async function initDatabase() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  log.info('Database initialized', { path: DB_PATH });
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function hashPassword(password: string): Promise<string> {
  return crypto.createHash('sha256').update(password + 'receiptflow_salt_v1').digest('hex');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export async function createUser(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
  const emailLower = email.toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [emailLower]);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, emailLower, name.trim(), passwordHash, now, now]
  );

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await db.run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userId, now, expiresAt]
  );

  const user: User = {
    id: userId,
    email: emailLower,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  return { user, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const emailLower = email.toLowerCase();
  const userRow = await db.get(
    `SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = ?`,
    [emailLower]
  );

  if (!userRow) {
    throw new Error('Invalid email or password.');
  }

  const isValid = await verifyPassword(password, userRow.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  // Delete old sessions for this user
  await db.run(`DELETE FROM sessions WHERE user_id = ?`, [userRow.id]);

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userRow.id, now, expiresAt]
  );

  const user: User = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  return { user, token };
}

export async function verifyToken(token: string): Promise<User | null> {
  const session = await db.get(
    `SELECT s.token, s.user_id, s.expires_at, u.id, u.email, u.name, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    name: session.name,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

export async function logoutUser(token: string): Promise<void> {
  await db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await db.all(`SELECT id, email, name, created_at, updated_at FROM users`);
  return rows.map((r: any) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}