/**
 * Auth state + token persistence.
 * Single source of truth for "am I logged in" across the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_BASE } from './artApi';

const TOKEN_KEY = 'palette_token';

export interface User {
  username: string;
  displayName: string;
  memberSince: string;
  favoritesCount?: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Boot: try to restore session from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          setTokenState(stored);
          // Validate token by fetching /me
          try {
            const me = await fetch(`${API_BASE}/me`, {
              headers: { Authorization: `Bearer ${stored}` },
            }).then((r) => (r.ok ? r.json() : null));
            if (me) setUser(me);
            else await AsyncStorage.removeItem(TOKEN_KEY);
          } catch {
            // Backend unreachable; keep token, we'll retry on next call
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Login failed');
    }
    const { token: t, user: u } = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setTokenState(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const me = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null));
      if (me) setUser(me);
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

/** Get the raw token (for use in non-React helpers). */
export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
