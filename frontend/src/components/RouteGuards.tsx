import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
  // Which roles are allowed through. Pass an empty array to allow any authenticated user.
  allowedRoles: string[];
  children: ReactNode;
}

// Wraps any route that requires authentication and/or a specific role.
// - No user at all → redirect to /login (they need to authenticate first)
// - Wrong role → redirect to / (which will re-redirect to their own dashboard)
export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Sends you to the right dashboard based on your role.
export function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Manager')  return <Navigate to="/manager"  replace />;
  if (user.role === 'Designer') return <Navigate to="/designer" replace />;
  if (user.role === 'Client')   return <Navigate to="/client"   replace />;
  return <Navigate to="/login" replace />;
}

// If you're already logged in and try to visit /login, it redirects you away.
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  if (user.role === 'Manager')  return <Navigate to="/manager"  replace />;
  if (user.role === 'Designer') return <Navigate to="/designer" replace />;
  if (user.role === 'Client')   return <Navigate to="/client"   replace />;
  return <>{children}</>;
}

// "replace" - replaces the current history entry.
// So if you're logged in and get redirected away from /login, pressing back won't bring you back to /login