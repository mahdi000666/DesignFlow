import { useState, useCallback, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import type { AuthUser } from './authContext';

function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

function initUser(): AuthUser | null {
  const token = localStorage.getItem('access_token');
  return token ? decodeJwt(token) : null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(initUser);

  const login = useCallback((access: string, refresh: string): AuthUser => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  const decoded = decodeJwt(access)!;
  setUser(decoded);
  return decoded;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}