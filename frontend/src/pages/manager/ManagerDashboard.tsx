import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, Activity, FolderOpen, MessageSquare } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import { useKPISummary, useBudgetVariance, useDesignerUtilization } from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import { getAllTimeLogs } from '../../api/timelogs';
import { getAllFiles } from '../../api/files';
import { getAllCompletedTasks, getAllTasks } from '../../api/tasks';
import { formatTND, formatEHR } from '../../utils/format';
import { barColor, CATEGORY_PALETTE } from '../../utils/project';

// ─── Constants ────────────────────────────────────────────────────────────────

const DONUT_COLORS = {
  Todo:       '#e2e8f0',
  InProgress: '#6366f1',
  Completed:  '#10b981',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (d: string): string => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Activity icon config ─────────────────────────────────────────────────────

type ActivityType = 'log' | 'file' | 'task' | 'feedback';

const ACTIVITY_CFG: Record<ActivityType, { bg: string; fg: string; icon: React.ReactNode }> = {
  feedback: {
    bg: '#fff7ed', fg: '#c2410c',
    icon: <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M2 3.5h11M2 7.5h7M2 11.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  task: {
    bg: '#f0fdf4', fg: '#15803d',
    icon: <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7.5l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  log: {
    bg: '#eff6ff', fg: '#1d4ed8',
    icon: <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M7.5 4.5V7.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  file: {
    bg: '#f0fdfa', fg: '#0f766e',
    icon: <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M3.5 13.5h8a1 1 0 001-1v-9l-3-3h-6a1 1 0 00-1 1v11a1 1 0 001 1z" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
};

// ─── Budget chart custom tooltip ──────────────────────────────────────────────

function BudgetTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs shadow-sm">
      <p className="font-semibold text-slate-800 mb-1.5 max-w-[160px] truncate">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-mono font-semibold text-slate-800">{p.value}h</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { data: kpi }               = useKPISummary();
  const { data: projects = [] }     = useProjects();
  const { data: budgetData = [] }   = useBudgetVariance({});
  const { data: utilization = [] }  = useDesignerUtilization({});

  const { data: allFeedback = [] }     = useQuery({ queryKey: ['feedback-all'],    queryFn: getAllFeedback });
  const { data: allLogs = [] }         = useQuery({ queryKey: ['timelogs-all'],    queryFn: getAllTimeLogs });
  const { data: allFiles = [] }        = useQuery({ queryKey: ['files-all'],       queryFn: getAllFiles });
  const { data: completedTasks = [] }  = useQuery({ queryKey: ['tasks-completed'], queryFn: getAllCompletedTasks });
  const { data: allTasks = [] }        = useQuery({ queryKey: ['tasks-all'],       queryFn: getAllTasks });

  // Fix #1: useState with lazy initializer avoids calling impure function during render
  const [nowMs] = useState(() => Date.now());

  // ── Derived ───────────────────────────────────────────────────────────────

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.project_name])),
    [projects],
  );

  const categoryColorMap = useMemo(() => {
    const cats = Array.from(
      new Set(projects.map(p => p.category).filter((c): c is string => Boolean(c))),
    ).sort();
    return new Map(cats.map((c, i) => [c, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]]));
  }, [projects]);

  const taskStatusData = useMemo(() => [
    { name: 'To Do',       value: allTasks.filter(t => t.status === 'Todo').length,       color: DONUT_COLORS.Todo },
    { name: 'In Progress', value: allTasks.filter(t => t.status === 'InProgress').length, color: DONUT_COLORS.InProgress },
    { name: 'Completed',   value: allTasks.filter(t => t.status === 'Completed').length,  color: DONUT_COLORS.Completed },
  ], [allTasks]);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'Active').slice(0, 6),
    [projects],
  );

  const upcomingDeadlines = useMemo(
    () =>
      projects
        .filter(p => p.deadline && p.status === 'Active')
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
        .slice(0, 5),
    [projects],
  );

  // Fix #6: Sort designer utilization by descending order
  const sortedUtilization = useMemo(
    () => [...utilization].sort((a, b) => (b.utilization_pct ?? 0) - (a.utilization_pct ?? 0)),
    [utilization],
  );

  type ActivityItem = { id: string; type: ActivityType; label: string; sub: string; date: string };
  const activity = useMemo((): ActivityItem[] =>
    [
      ...allFeedback.map(f => ({
        id: `fb-${f.id}`, type: 'feedback' as ActivityType,
        label: `New ${f.category.toLowerCase()} feedback on ${f.project_name}`,
        sub: f.project_name, date: f.submitted_at,
      })),
      ...allLogs.map(l => ({
        id: `log-${l.id}`, type: 'log' as ActivityType,
        label: `${l.designer_name} logged ${Number(l.hours_spent)}h — ${l.task_name}`,
        sub: l.project_name, date: l.created_at,
      })),
      ...allFiles.map(f => ({
        id: `file-${f.id}`, type: 'file' as ActivityType,
        label: `${f.uploaded_by_name} uploaded ${f.file_name}`,
        sub: projectNameById[f.project] ?? '—', date: f.uploaded_at,
      })),
      ...completedTasks
        .filter(t => t.completed_at !== null)
        .map(t => ({
          id: `task-${t.id}`, type: 'task' as ActivityType,
          label: `Task "${t.task_name}" completed`,
          sub: t.project_name, date: t.completed_at!,
        })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
  [allFeedback, allLogs, allFiles, completedTasks, projectNameById]);

  const KPI_CARDS = [
    {
      label: 'Total Revenue',
      value: kpi ? formatTND(kpi.total_revenue) : '—',
      icon: <DollarSign size={15} />,
      borderColor: '#6366f1',
    },
    {
      label: 'Avg. EHR',
      value: kpi ? formatEHR(kpi.avg_ehr) : '—',
      icon: <Activity size={15} />,
      borderColor: '#10b981',
    },
    {
      label: 'Active Projects',
      value: kpi ? String(kpi.active_projects) : '—',
      icon: <FolderOpen size={15} />,
      borderColor: '#f59e0b',
    },
    {
      label: 'Pending Feedback',
      value: kpi ? String(kpi.pending_feedback) : '—',
      icon: <MessageSquare size={15} />,
      borderColor: '#ef4444',
    },
  ];

  return (
    <AppShell title="Dashboard">

      {/* ── Row 1: KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} borderColor={c.borderColor} />
        ))}
      </div>

      {/* ── Row 2: Budget vs Actual + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-4">

        {/* Fix #4: Reworked Budget vs Actual chart to match mockup */}
        <div className="col-span-2 card p-5">
          <p className="section-title mb-5">Budget vs Actual Hours</p>
          {budgetData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={budgetData}
                margin={{ top: 4, right: 16, left: -10, bottom: 80 }}
                barCategoryGap="20%"
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="project_name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}h`}
                />
                <Tooltip content={<BudgetTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="square"
                  iconSize={10}
                />
                <Bar dataKey="budget_hours" name="Budget Hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="actual_hours" name="Actual Hours" fill="#bfdbfe" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity — merged feed */}
        <div className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <p className="section-title mb-0">Recent Activity</p>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-50 overflow-y-auto flex-1">
              {activity.map(item => {
                const cfg = ACTIVITY_CFG[item.type];
                return (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-snug line-clamp-2">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">
                      {timeAgo(item.date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Row 3: Designer Util + Tasks by Status + Upcoming Deadlines ─────── */}
      <div className="grid grid-cols-3 gap-4 mb-4">

        {/* Designer Utilisation — Fix #6: sorted by descending order */}
        <div className="card p-5">
          <p className="section-title mb-4">Designer Utilisation</p>
          {sortedUtilization.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No designers found</p>
          ) : (
            <div className="space-y-4">
              {sortedUtilization.map(d => {
                const pct = d.utilization_pct ?? 0;
                return (
                  <div key={d.designer_id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-slate-700 font-medium truncate max-w-[130px]">
                        {d.designer_name}
                      </span>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {d.utilization_pct !== null ? `${pct.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks by Status — donut */}
        <div className="card p-5">
          <p className="section-title mb-3">Tasks by Status</p>
          {allTasks.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">No tasks</div>
          ) : (
            <div className="flex items-center justify-center gap-5 pt-1">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {taskStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {taskStatusData.map(e => (
                  <div key={e.name} className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="text-xs text-slate-600">{e.name}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-800">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card p-5">
          <p className="section-title mb-4">Upcoming Deadlines</p>
          {upcomingDeadlines.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No upcoming deadlines</p>
          ) : (
            <ul className="space-y-3.5">
              {upcomingDeadlines.map(p => {
                const daysLeft = Math.ceil(
                  (new Date(p.deadline!).getTime() - nowMs) / 86400000,
                );
                const urgent = daysLeft <= 7;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/manager/projects/${p.id}`}
                        className="text-sm font-medium text-slate-800 hover:text-primary truncate block leading-tight"
                      >
                        {p.project_name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{p.client_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${urgent ? 'text-rose-600' : 'text-slate-600'}`}>
                        {p.deadline}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>
                        {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Row 4: Active Projects table ──────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="section-title mb-0">Active Projects</p>
          <Link
            to="/manager/projects"
            className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
          >
            View all →
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No active projects.</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_160px_130px_100px] gap-4 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Project</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Budget</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">EHR</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Deadline</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {activeProjects.map(p => {
                const pct = p.budget_hours && p.actual_hours != null
                  ? Math.round((p.actual_hours / Number(p.budget_hours)) * 100)
                  : null;
                const ehr = p.budget_amount && p.actual_hours > 0
                  ? Number(p.budget_amount) / p.actual_hours
                  : null;
                const isOver = p.budget_hours != null && p.actual_hours > Number(p.budget_hours);
                return (
                  <li key={p.id}>
                    <Link
                      to={`/manager/projects/${p.id}`}
                      className="grid grid-cols-[1fr_160px_130px_100px] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      {/* Name + client */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.project_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{p.client_name}</span>
                          {p.category && (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryColorMap.get(p.category) ?? 'bg-slate-50 text-slate-700'}`}>
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Budget bar */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 shrink-0 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          {pct !== null && (
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor(pct) }}
                            />
                          )}
                        </div>
                        {pct !== null ? (
                          <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                            {Math.round(p.actual_hours)}/{Math.round(Number(p.budget_hours))}h
                            {isOver && <span className="ml-0.5 text-rose-500">↑</span>}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </div>

                      {/* EHR — formatEHR applied */}
                      <div className="text-right">
                        {ehr !== null ? (
                          <span className={`font-mono text-xs font-bold ${isOver ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatEHR(ehr)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </div>

                      {/* Deadline */}
                      <div className="text-right">
                        {p.deadline ? (
                          <span className="text-xs text-slate-500">{p.deadline}</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

    </AppShell>
  );
}
