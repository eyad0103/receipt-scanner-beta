import { SignJWT, jwtVerify } from 'jose';
import { Database } from '../db';
import type { User } from '../db';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(salt))) + ':' + btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 2) return false;
  const saltB64 = parts[0];
  const hashB64 = parts[1];
  if (!saltB64 || !hashB64) return false;
  
  const salt = new Uint8Array(atob(saltB64).split('').map(c => c.charCodeAt(0)));
  const expectedHash = new Uint8Array(atob(hashB64).split('').map(c => c.charCodeAt(0)));
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const derivedArr = new Uint8Array(derived);
  if (derivedArr.length !== expectedHash.length) return false;
  return derivedArr.every((v, i) => v === expectedHash[i]);
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