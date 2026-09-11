import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, acceptTerms: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api';
const SESSION_KEY = 'receiptflow_session';

async function hashPasswordFallback(password: string): Promise<string> {
  // Fallback for environments without crypto.subtle
  let hash = 0;
  const str = password + 'receiptflow_salt_v1';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'receiptflow_salt_v1');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return hashPasswordFallback(password);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const initAuth = async () => {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { user, token } = JSON.parse(session);
          // Verify token with backend
          const res = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setState({ user: data.user, isLoading: false, isAuthenticated: true });
              return;
            }
          }
        } catch {}
        localStorage.removeItem(SESSION_KEY);
      }
      setState({ user: null, isLoading: false, isAuthenticated: false });
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, token: data.token }));
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, acceptTerms: boolean) => {
    if (!acceptTerms) {
      return { success: false, error: 'You must accept the Terms & Conditions and Privacy Policy.' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, token: data.token }));
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error || 'Signup failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const { token } = JSON.parse(session);
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}