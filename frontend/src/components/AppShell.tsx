import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ─── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
  label:     string;
  path:      string;
  icon:      string;
  disabled?: boolean;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  Manager: [
    { label: 'Dashboard',  path: '/manager',           icon: '◈' },
    { label: 'Projects',   path: '/manager/projects',  icon: '▣' },
    { label: 'Analytics',  path: '/manager/analytics', icon: '∑', disabled: true },
    { label: 'Reports',    path: '/manager/reports',   icon: '≡', disabled: true },
  ],
  Designer: [
    { label: 'Dashboard',   path: '/designer',          icon: '◈' },
    { label: 'My Projects', path: '/designer/projects', icon: '▣' },
  ],
  Client: [
    { label: 'Dashboard',   path: '/client',          icon: '◈' },
    { label: 'My Projects', path: '/client/projects', icon: '▣' },
  ],
};

const ROLE_PILL: Record<string, string> = {
  Manager:  'bg-amber  text-white',
  Designer: 'bg-teal   text-white',
  Client:   'bg-[#7C3AED] text-white',
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

  // Exact match for the root dashboard, prefix match for nested routes.
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
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <nav className="w-[220px] h-screen bg-sidebar flex flex-col shrink-0 overflow-y-auto">

        {/* Brand */}
        <div className="p-5 border-b border-white/[0.08]">
          <div className="font-serif text-[17px] text-white tracking-tight">DesignOps</div>
          <div className="text-[10px] uppercase tracking-[1px] text-[#9B8E84] mt-[2px]">
            Analytics Platform
          </div>
        </div>

        {/* Role pill */}
        <div className={`${ROLE_PILL[role]} text-[11px] font-semibold uppercase tracking-[0.5px] text-center rounded-full px-3 py-[6px] mx-4 mt-4 mb-1`}>
          {role}
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-[6px]">
          <span className="font-sans text-[10px] uppercase tracking-[1px] text-[#6B6058]">
            Navigation
          </span>
        </div>

        {/* Nav items */}
        <div className="flex-1">
          {navItems.map(item =>
            item.disabled ? (
              <div
                key={item.path}
                className="flex items-center gap-[10px] px-5 py-2 text-[13px] font-medium text-[#4A4440] border-l-2 border-transparent cursor-not-allowed opacity-40 select-none"
              >
                <span className="w-4 text-center text-[14px]">{item.icon}</span>
                {item.label}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-[10px] px-5 py-2 text-[13px] font-medium border-l-2 transition-all ${
                  isActive(item.path)
                    ? 'text-white border-amber bg-amber/10'
                    : 'text-[#B8B0A8] border-transparent hover:text-[#F0EDE6] hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-4 text-center text-[14px]">{item.icon}</span>
                {item.label}
              </Link>
            )
          )}
        </div>

        {/* Footer avatar */}
        <div className="mt-auto p-5 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
              <span className="font-sans text-[11px] font-semibold text-amber">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[12px] font-medium text-white truncate">
                {user?.full_name}
              </div>
              <button
                onClick={logout}
                className="font-sans text-[11px] text-[#9B8E84] hover:text-[#F0EDE6] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-surface border-b border-border flex items-center px-7 gap-4 shrink-0">
          <h2 className="font-serif text-[18px] font-normal text-ink">{title}</h2>
          {breadcrumb && (
            <span className="font-sans text-[12px] text-ink3 ml-1">{breadcrumb}</span>
          )}
          <div className="flex-1" />
          {actions}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
