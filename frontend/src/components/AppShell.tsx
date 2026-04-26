import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <path d="M1.5 3.5a1 1 0 011-1H6l1.5 2H13a1 1 0 011 1v7a1 1 0 01-1 1H2.5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <path d="M1.5 11.5l3.5-4.5 3 2 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1 12.5c0-2.485 2.015-4.5 4.5-4.5S10 10.015 10 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 8c1.657 0 3 1.343 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.4 3.4l.7.7M10.9 10.9l.7.7M10.9 4.1l-.7.7M4.1 10.9l-.7.7"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      />
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
    `flex items-center gap-3 py-2 rounded-md text-sm transition-colors ${
      isActive(path)
        ? 'bg-slate-800 text-white border-l-[3px] border-blue-500 pl-[9px] pr-3'
        : 'text-slate-400 hover:text-white hover:bg-slate-800 px-3'
    }`;

  const avatarInitials = user?.full_name ? Initials(user.full_name) : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-[220px] bg-slate-900 flex flex-col shrink-0 border-r border-slate-800">

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">DesignOps</span>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-300 text-xs">{role}</p>
                <button
                  onClick={logout}
                  className="text-slate-300 text-[10px] hover:text-slate-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
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
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            {breadcrumb && (
              <p className="text-[11px] text-slate-400 font-medium mb-1">{breadcrumb}</p>
            )}
            <h1 className="font-display text-[26px] leading-tight text-slate-900">{title}</h1>
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