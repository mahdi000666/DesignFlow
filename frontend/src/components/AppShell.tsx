import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

function IconReports() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <rect x="2.5" y="1" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 5h4M5.5 7.5h4M5.5 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
  label:     string;
  path:      string;
  icon:      ReactNode;
  disabled?: boolean;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  Manager: [
    { label: 'Dashboard', path: '/manager',           icon: <IconDashboard /> },
    { label: 'Projects',  path: '/manager/projects',  icon: <IconProjects /> },
    { label: 'Analytics', path: '/manager/analytics', icon: <IconAnalytics />, disabled: true },
    { label: 'Reports',   path: '/manager/reports',   icon: <IconReports />,   disabled: true },
  ],
  Designer: [
    { label: 'Dashboard',   path: '/designer',          icon: <IconDashboard /> },
    { label: 'My Projects', path: '/designer/projects', icon: <IconProjects /> },
  ],
  Client: [
    { label: 'Dashboard',   path: '/client',          icon: <IconDashboard /> },
    { label: 'My Projects', path: '/client/projects', icon: <IconProjects /> },
  ],
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppShellProps {
  title:       string;
  breadcrumb?: string;
  actions?:    ReactNode;
  children:    ReactNode;
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function AppShell({ title, breadcrumb, actions, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const role             = user?.role ?? 'Manager';
  const navItems         = NAV_BY_ROLE[role] ?? [];

  // Exact match for root dashboard; prefix match for nested routes.
  const isActive = (path: string) => {
    const base = `/${role.toLowerCase()}`;
    return path === base
      ? location.pathname === path
      : location.pathname.startsWith(path);
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

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
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-500 text-xs">{role}</p>
                <button
                  onClick={logout}
                  className="text-slate-500 text-[10px] hover:text-slate-300 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item =>
            item.disabled ? (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-600 text-sm cursor-not-allowed opacity-40 select-none"
              >
                {item.icon}
                {item.label}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-800 text-white border-l-[3px] border-blue-500 pl-[9px] pr-3'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 px-3'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Footer — system status */}
        <div className="px-5 py-3.5 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-slate-500 text-xs">System operational</span>
          </div>
        </div>
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