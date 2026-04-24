import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { getAllTimeLogs } from '../../api/timelogs';
import { getAllTasks } from '../../api/tasks';
import AppShell from '../../components/AppShell';
import apiClient from '../../api/clients';
import type { Project } from '../../types/project';
import type { ReactNode } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  OnHold:    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
};

const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-blue-500',
  Completed: 'bg-emerald-500',
  OnHold:    'bg-amber-500',
};

const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';

function KPICard({
  label, value, subtitle, borderColor,
}: { label: string; value: ReactNode; subtitle: string; borderColor: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden">
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-xl" style={{ backgroundColor: borderColor }} />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DesignerDashboard() {
  const { user } = useAuth();
  const userId = user?.user_id ?? 0;

  const { data: projects = [] } = useProjects();

  const { data: allLogs = [] } = useQuery({
    queryKey: ['timelogs-all'],
    queryFn:  getAllTimeLogs,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn:  getAllTasks,
  });

  // Designer profile for available_hours_per_week
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => apiClient.get('/users/me/').then(r => r.data),
  });
  const availableHoursPerWeek: number | null =
    (me?.designer_profile?.available_hours_per_week as number | null | undefined) ?? null;

  // ── Derived KPI values ────────────────────────────────────────────────────

  // Hours logged this calendar week (Mon–Sun), by the current designer
  const hoursThisWeek = useMemo(() => {
    const now  = new Date();
    const diff = now.getDay() === 0 ? 6 : now.getDay() - 1; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return allLogs
      .filter(l => l.designer_user_id === userId && new Date(l.created_at) >= monday)
      .reduce((sum, l) => sum + Number(l.hours_spent), 0);
  }, [allLogs, userId]);

  const utilisation = availableHoursPerWeek && availableHoursPerWeek > 0
    ? Math.round((hoursThisWeek / availableHoursPerWeek) * 100)
    : null;

  const openTasks = allTasks.filter(t => t.status !== 'Completed');
  const activeProjects = projects.filter(p => p.status === 'Active');

  // ── Summary card data ─────────────────────────────────────────────────────

  const recentLogs = useMemo(
    () =>
      [...allLogs]
        .filter(l => l.designer_user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [allLogs, userId],
  );

  return (
    <AppShell title="Dashboard">
      <div className="mb-5">
        <p className="text-sm text-slate-500">Welcome back, <span className="font-medium text-slate-700">{user?.full_name}</span></p>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Assigned Projects"
          value={projects.length}
          subtitle={`${activeProjects.length} active`}
          borderColor="#3b82f6"
        />
        <KPICard
          label="Open Tasks"
          value={openTasks.length}
          subtitle="across all projects"
          borderColor="#8b5cf6"
        />
        <KPICard
          label="Hours This Week"
          value={`${hoursThisWeek.toFixed(1)} h`}
          subtitle={availableHoursPerWeek ? `of ${availableHoursPerWeek} h available` : 'logged'}
          borderColor="#10b981"
        />
        <KPICard
          label="Utilisation"
          value={utilisation != null ? `${utilisation}%` : '—'}
          subtitle={availableHoursPerWeek ? `${availableHoursPerWeek} h/week capacity` : 'Set available hours'}
          borderColor="#f59e0b"
        />
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* My Projects */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Projects</p>
            <Link to="/designer/projects" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">No projects assigned.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.slice(0, 5).map(p => {
                const pct = p.budget_hours && p.actual_hours != null
                  ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
                  : null;
                return (
                  <li key={p.id}>
                    <Link to={`/designer/projects/${p.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                          {p.project_name}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                          {p.status === 'OnHold' ? 'On Hold' : p.status}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">{pct}%</span>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Open Tasks */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open Tasks</p>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">No open tasks.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openTasks.slice(0, 5).map(t => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700 truncate">{t.task_name}</p>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      t.status === 'InProgress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {t.status === 'InProgress' ? 'In Progress' : 'To Do'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{t.project_name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Time Logs */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Time Logs</p>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">No time logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLogs.map(log => (
                <li key={log.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{log.task_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{log.project_name}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-700 shrink-0">
                    {Number(log.hours_spent).toFixed(1)} h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}