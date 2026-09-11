import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { receiptRouter } from './routes/receipts';
import { authRouter } from './routes/auth';
import type { Database } from './db';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  APP_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://receiptflow.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/api/receipts', receiptRouter);
app.route('/api/auth', authRouter);

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;