import { createContext } from 'react';

export interface AuthUser {
  user_id: number;
  email: string;
  full_name: string;
  role: 'Manager' | 'Designer' | 'Client';
}

export interface AuthContextValue {
  user: AuthUser | null; // Context value can be null when logged out.
  login: (access: string, refresh: string) => AuthUser;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

// Create a global state.
export const AuthContext = createContext<AuthContextValue | null>(null);