// frontend/src/context/AuthProvider.tsx
import { useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './authContext';
import type { AuthUser } from './authContext';

// Decode JWT client-side so we can access user info without making an extra API call.
function decodeJwt(token: string): AuthUser | null {
  try {
    // Split the string and get the second element (payload).
    const payload = token.split('.')[1];
    // Decode base64 string to plain text.
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

// Check localstorage for an existing token. If the user refreshes the page, they stay logged in.
function initUser(): AuthUser | null {
  const token = localStorage.getItem('access_token');
  return token ? decodeJwt(token) : null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // Initial value is initUser.
  const [user, setUser] = useState<AuthUser | null>(initUser);
  const queryClient = useQueryClient();

  // queryClient.clear() clears react query cache on login/logout, prevents a new user from seeing the previous user’s cached data.
  // useCallback to prevent the function from being recreated every render.
  const login = useCallback((access: string, refresh: string): AuthUser => {
    // Clear role-scoped API caches before switching sessions.
    queryClient.clear();
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    const decoded = decodeJwt(access)!;
    setUser(decoded);
    return decoded;
  }, [queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Updates some fields of the user object without replacing the whole thing.
  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    // ...prev copy all existing properties, ...patch overwrite with new values from patch.
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
