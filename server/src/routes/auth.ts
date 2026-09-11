import { Router } from 'express';
import { log } from '../logging/index.js';
import { createUser, loginUser, verifyToken, logoutUser } from '../db/database.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
      return;
    }

    const commonPasswords = ['password', 'password123', '12345678', 'qwertyuiop', 'abcdefgh'];
    if (commonPasswords.includes(password.toLowerCase())) {
      res.status(400).json({ success: false, error: 'Password is too common. Please choose a stronger password.' });
      return;
    }

    const { user, token } = await createUser(name, email, password);

    res.status(201).json({ success: true, user, token });
  } catch (err: any) {
    log.error('Registration error', err);
    const message = err?.message || 'Registration failed.';
    const status = message.includes('already exists') ? 409 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const { user, token } = await loginUser(email, password);

    res.json({ success: true, user, token });
  } catch (err: any) {
    log.error('Login error', err);
    res.status(401).json({ success: false, error: err.message || 'Login failed.' });
  }
});

authRouter.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Token required.' });
      return;
    }

    const user = await verifyToken(token);

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid or expired session.' });
      return;
    }

    res.json({ success: true, user });
  } catch (err) {
    log.error('Session verification error', err);
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await logoutUser(token);
    }
    res.json({ success: true });
  } catch (err) {
    log.error('Logout error', err);
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});