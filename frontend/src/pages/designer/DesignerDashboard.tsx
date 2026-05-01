import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { getAllTimeLogs } from '../../api/timelogs';
import { getAllTasks } from '../../api/tasks';
import AppShell from '../../components/AppShell';
import apiClient from '../../api/clients';
import { KpiCard } from '../../components/Ui';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, CATEGORY_PALETTE } from '../../utils/project';
import {
  FolderOpen, Clock, Activity,
  ListTodo, Timer,
} from 'lucide-react';

export default function DesignerDashboard() {
  const { user } = useAuth();
  const userId = Number(user?.user_id ?? 0);

  const { data: projects = [] } = useProjects();

  const { data: allLogs = [] } = useQuery({
    queryKey: ['timelogs', 'all'],
    queryFn: getAllTimeLogs,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn:  getAllTasks,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => apiClient.get('/users/me/').then(r => r.data),
  });
  const availableHoursPerWeek: number | null =
    (me?.available_hours_per_week as number | null | undefined) ?? null;

  const hoursThisWeek = useMemo(() => {
    const now  = new Date();
    const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
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

  const recentLogs = useMemo(
    () =>
      [...allLogs]
        .filter(l => l.designer_user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [allLogs, userId],
  );

  const categoryColorMap = useMemo(() => {
    const cats = Array.from(
      new Set(projects.map(p => p.category).filter((c): c is string => Boolean(c)))
    ).sort();
    return new Map(cats.map((c, i) => [c, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]]));
  }, [projects]);

  return (
    <AppShell title="Dashboard">

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard
          label="Assigned Projects"
          value={projects.length}
          icon={<FolderOpen size={15} />}
        />
        <KpiCard
          label="Open Tasks"
          value={openTasks.length}
          icon={<ListTodo size={15} />}
        />
        <KpiCard
          label="Hours This Week"
          value={`${hoursThisWeek.toFixed(1)} h`}
          icon={<Clock size={15} />}
        />
        <KpiCard
          label="Utilisation"
          value={utilisation != null ? `${utilisation}%` : '—'}
          icon={<Activity size={15} />}
        />
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3.5">

        {/* My Projects */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="section-title mb-0">My Projects</p>
            <Link to="/designer/projects" className="text-xs font-medium text-primary hover:text-primary-600 transition-colors">View all →</Link>
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
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary transition-colors">
                          {p.project_name}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                          {statusLabel(p.status)}
                        </span>
                      </div>
                      {p.category && (
                        <div className="mb-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryColorMap.get(p.category) ?? 'bg-slate-50 text-slate-700'}`}>
                            {p.category}
                          </span>
                        </div>
                      )}
                      {pct !== null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="section-title mb-0">Open Tasks</p>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">No open tasks.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openTasks.slice(0, 5).map(t => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700 truncate">{t.task_name}</p>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      t.status === 'InProgress'
                        ? 'badge-active'
                        : 'badge-pending'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        t.status === 'InProgress' ? 'bg-primary' : 'bg-slate-400'
                      }`} />
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
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="section-title mb-0">Recent Time Logs</p>
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Timer size={12} className="text-slate-400" />
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {Number(log.hours_spent).toFixed(1)} h
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}