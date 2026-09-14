import { SignJWT, jwtVerify } from 'jose';
import { Database } from '../db';
import type { User } from '../db';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const data = encoder.encode(salt + ':' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(salt) + ':' + toBase64(new Uint8Array(hash));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split(':');
    if (parts.length !== 2) return false;
    const [saltB64, hashB64] = parts;
    if (!saltB64 || !hashB64) return false;

    const salt = fromBase64(saltB64);
    const expectedHash = fromBase64(hashB64);

    const data = encoder.encode(salt + ':' + password);
    const derived = await crypto.subtle.digest('SHA-256', data);
    const derivedArr = new Uint8Array(derived);
    if (derivedArr.length !== expectedHash.length) return false;
    return derivedArr.every((v, i) => v === expectedHash[i]);
  } catch (e) {
    console.error('verifyPassword error:', e);
    return false;
  }
}

export function generateToken(payload: JWTPayload, secret: string, expiry = '7d'): Promise<string> {
  const expSeconds = expiry.endsWith('d') ? parseInt(expiry) * 86400 : 604800;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .sign(encoder.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request, env: Env): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) return null;

  const db = new Database(env.DB);
  return db.getUserById(payload.userId);
}

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  APP_URL: string;
}