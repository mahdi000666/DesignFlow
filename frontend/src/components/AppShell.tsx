import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';

// ─── Icons (DesignFlow style — 18×18, lucide-like strokes) ──────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.1a2 2 0 01-1-1.72v-.51a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path:  string;
  icon:  ReactNode;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  Manager: [
    { label: 'Dashboard', path: '/manager',           icon: <IconDashboard /> },
    { label: 'Analytics', path: '/manager/analytics', icon: <IconAnalytics /> },
    { label: 'Projects',  path: '/manager/projects',  icon: <IconProjects /> },
    { label: 'Team',      path: '/manager/team',      icon: <IconTeam /> },
    { label: 'Settings',  path: '/settings',          icon: <IconSettings /> },
  ],
  Designer: [
    { label: 'Dashboard',   path: '/designer',          icon: <IconDashboard /> },
    { label: 'My Projects', path: '/designer/projects', icon: <IconProjects /> },
    { label: 'Settings',    path: '/settings',          icon: <IconSettings /> },
  ],
  Client: [
    { label: 'Dashboard', path: '/client',   icon: <IconDashboard /> },
    { label: 'Settings',  path: '/settings', icon: <IconSettings /> },
  ],
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppShellProps {
  title:       string;
  breadcrumb?: string | React.ReactNode;
  actions?:    ReactNode;
  children:    ReactNode;
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function AppShell({ title, breadcrumb, actions, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const role             = user?.role ?? 'Manager';
  const navItems         = NAV_BY_ROLE[role] ?? [];

  const isActive = (path: string) => {
    const base = `/${role.toLowerCase()}`;
    return path === base
      ? location.pathname === path
      : location.pathname.startsWith(path);
  };

  const linkCls = (path: string) =>
    `flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive(path)
        ? 'bg-primary text-white shadow-sm'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 px-3'
    } ${isActive(path) ? 'px-3' : ''}`;

  const avatarInitials = user?.full_name ? Initials(user.full_name) : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-sidebar flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.08)]">

        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-white font-bold text-base tracking-tight">DesignFlow</span>
        </div>

        {/* Profile */}
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-400 text-xs">{role}</p>
                <button
                  onClick={logout}
                  className="text-slate-400 text-[10px] hover:text-slate-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={linkCls(item.path)}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="min-w-0">
            {breadcrumb && (
              <p className="text-[11px] text-slate-400 font-medium mb-1">{breadcrumb}</p>
            )}
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
          {actions && (
            <div className="flex items-center gap-2.5 shrink-0">
              {actions}
            </div>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
