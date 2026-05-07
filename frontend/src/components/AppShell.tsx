import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';
import { useMe } from '../hooks/useUsers';
import {
  IconDashboard,
  IconProjects,
  IconAnalytics,
  IconTeam,
  IconSettings,
} from '../components/Icons';
import Logo from '../assets/icons/logo.svg?react';

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
  const { data: me }     = useMe();
  const location         = useLocation();
  const role             = user?.role ?? 'Manager';
  const navItems         = NAV_BY_ROLE[role] ?? [];

  const isActive = (path: string) => {
    const base = `/${role.toLowerCase()}`;
    return path === base
      ? location.pathname === path
      : location.pathname.startsWith(path);
  };

  {/* Nav link builder */}
const linkCls = (path: string) =>
  `flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
    isActive(path)
      ? 'bg-primary text-white shadow-xs'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 px-2.5'
  } ${isActive(path) ? 'px-2.5' : ''}`;

  const avatarInitials = user?.full_name ? Initials(user.full_name) : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Sidebar shell */}
<aside className="w-56 bg-sidebar flex flex-col shrink-0 shadow-sidebar">

        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Logo />
          </div>
          <span className="text-white font-bold text-base tracking-tight">DesignFlow</span>
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

        {/* Profile — identity anchor at bottom */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            {/* Bottom avatar */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
              {me?.avatar_url
                ? <img src={me.avatar_url} alt={me.full_name} className="w-full h-full object-cover" />
                : avatarInitials
              }
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

      </aside>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
          {/* Left: Title + Breadcrumb stacked */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {breadcrumb && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
                {breadcrumb}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          {actions && (
            <div className="flex items-center gap-2.5 shrink-0 ml-6">
              {actions}
            </div>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}