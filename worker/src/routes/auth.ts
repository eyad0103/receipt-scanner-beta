import { Hono } from 'hono';
import { z } from 'zod';
import { Database } from '../db';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '../auth';
import type { Env } from '../index';

const authRouter = new Hono<{ Bindings: Env }>();

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  acceptTerms: z.boolean(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid input' }, 400);
  }

  const { name, email, password, acceptTerms } = parsed.data;
  if (!acceptTerms) {
    return c.json({ success: false, error: 'Must accept terms' }, 400);
  }

  const db = new Database(c.env.DB);
  const existing = await db.getUserByEmail(email);
  if (existing) {
    return c.json({ success: false, error: 'Email already registered' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  
  await db.createUser({
    id: userId,
    email,
    name,
    password_hash: passwordHash,
  });

  const token = await generateToken({ userId, email, name }, c.env.JWT_SECRET, c.env.JWT_EXPIRY);

  return c.json({
    success: true,
    token,
    user: { id: userId, email, name, createdAt: new Date().toISOString() },
  });
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid input' }, 400);
  }

  const { email, password } = parsed.data;
  const db = new Database(c.env.DB);
  const user = await db.getUserByEmail(email);
  
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const token = await generateToken({ userId: user.id, email: user.email, name: user.name }, c.env.JWT_SECRET, c.env.JWT_EXPIRY);

  return c.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.created_at },
  });
});

authRouter.post('/verify', async (c) => {
  const body = await c.req.json();
  const token = body.token;
  if (!token) return c.json({ success: false, error: 'No token' }, 400);

  const payload = await import('../auth').then(m => m.verifyToken(token, c.env.JWT_SECRET));
  if (!payload) return c.json({ success: false, error: 'Invalid token' }, 401);

  const db = new Database(c.env.DB);
  const user = await db.getUserById(payload.userId);
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);

  return c.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get('/me', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  return c.json({ id: user.id, email: user.email, name: user.name, createdAt: user.created_at });
});

export { authRouter };