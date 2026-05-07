import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Label,
} from 'recharts';
import {
  DollarSign, Activity, FolderOpen, MessageSquare,
  CheckCircle2, Clock, FileText, ChevronDown, ChevronUp, X, 
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import { useKPISummary, useBudgetVariance, useDesignerUtilization } from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import { getAllTimeLogs } from '../../api/timelogs';
import { useActivityLogs } from '../../hooks/useTimeLogs';
import type { ActivityLog } from '../../types/timelog';
import { getAllFiles } from '../../api/files';
import { getAllCompletedTasks, getAllTasks } from '../../api/tasks';
import { formatTND, formatEHR } from '../../utils/format';
import { barColor, categoryClass } from '../../utils/project';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_LIMIT = 4;

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
    icon: <MessageSquare size={13} />,
  },
  task: {
    bg: '#f0fdf4', fg: '#15803d',
    icon: <CheckCircle2 size={13} />,
  },
  log: {
    bg: '#eff6ff', fg: '#1d4ed8',
    icon: <Clock size={13} />,
  },
  file: {
    bg: '#f3e8ff', fg: '#7e22ce',
    icon: <FileText size={13} />,
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
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs shadow-xs">
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

// ─── Activity Modal ───────────────────────────────────────────────────────────

const ACTION_STYLE: Record<ActivityLog['action'], { bg: string; text: string; label: string }> = {
  start:  { bg: 'bg-primary-50',   text: 'text-primary-700',  label: 'Started'  },
  pause:  { bg: 'bg-amber-50',     text: 'text-amber-700',    label: 'Paused'   },
  resume: { bg: 'bg-blue-50',      text: 'text-blue-700',     label: 'Resumed'  },
  stop:   { bg: 'bg-emerald-50',   text: 'text-emerald-700',  label: 'Stopped'  },
};

const fmtTs = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

function ActivityModal({
  designerUserId,
  designerName,
  onClose,
}: {
  designerUserId: number;
  designerName:   string;
  onClose:        () => void;
}) {
  const { data: logs = [], isLoading } = useActivityLogs(designerUserId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Activity History</p>
            <p className="text-xs text-slate-400 mt-0.5">{designerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading && <p className="text-sm text-slate-400 text-center py-8">Loading…</p>}
          {!isLoading && logs.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No activity recorded yet.</p>
          )}
          {!isLoading && logs.length > 0 && (
            <ul className="space-y-2.5">
              {logs.map(log => {
                const s = ACTION_STYLE[log.action];
                return (
                  <li key={log.id} className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium truncate">{log.task_name}</p>
                      <p className="text-xs text-slate-400 truncate">{log.project_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 whitespace-nowrap">{fmtTs(log.timestamp)}</p>
                      {log.hours_logged && (
                        <p className="font-mono text-xs font-semibold text-emerald-700 mt-0.5">
                          +{Number(log.hours_logged).toFixed(2)}h logged
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const [selectedDesigner, setSelectedDesigner] = useState<{ id: number; name: string } | null>(null);
  const [nowMs]             = useState(() => Date.now());
  const [activityExpanded, setActivityExpanded] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.project_name])),
    [projects],
  );

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

  // Sorted descending, designers with no utilisation excluded
  const sortedUtilization = useMemo(
    () => [...utilization]
      .filter(d => d.utilization_pct !== null)
      .sort((a, b) => (b.utilization_pct ?? 0) - (a.utilization_pct ?? 0)),
    [utilization],
  );
  const budgetChartMax = useMemo(
    () => budgetData.reduce((max, row) => Math.max(max, row.budget_hours, row.actual_hours), 0),
    [budgetData],
  );
  const budgetTickStep = useMemo(
    () => {
      if (budgetChartMax <= 0) return 10;
      return Math.max(10, Math.ceil(budgetChartMax / 4 / 10) * 10);
    },
    [budgetChartMax],
  );
  const budgetTicks = useMemo(
    () => Array.from({ length: 5 }, (_, i) => i * budgetTickStep),
    [budgetTickStep],
  );
  const activeProjectGrid = 'grid-cols-[minmax(0,1.7fr)_minmax(148px,1.15fr)_88px_96px]';

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
      .slice(0, 20),
  [allFeedback, allLogs, allFiles, completedTasks, projectNameById]);

  const visibleActivity = activityExpanded ? activity : activity.slice(0, ACTIVITY_LIMIT);
  const hasMoreActivity = activity.length > ACTIVITY_LIMIT;

  const KPI_CARDS = [
    {
      label: 'Total Revenue',
      value: kpi ? formatTND(kpi.total_revenue) : '—',
      icon: <DollarSign size={15} />,
      borderColor: "#6366f1",
    },
    {
      label: 'Avg. EHR',
      value: kpi ? formatEHR(kpi.avg_ehr) : '—',
      icon: <Activity size={15} />,
      borderColor: "#22c55e",
    },
    {
      label: 'Active Projects',
      value: kpi ? String(kpi.active_projects) : '—',
      icon: <FolderOpen size={15} />,
      borderColor: "#f59e0b",
    },
    {
      label: 'Pending Feedback',
      value: kpi ? String(kpi.pending_feedback) : '—',
      icon: <MessageSquare size={15} />,
      borderColor: "#3b82f6",
    },
  ];

  return (
    <AppShell title="Dashboard">

      {/* ── Row 1: KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} borderColor={c.borderColor} />
        ))}
      </div>

      {/* ── Row 2: Budget vs Actual + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-[4fr_2fr] gap-3.5 mb-3.5">

        {/* Budget vs Actual chart */}
        <div className="card p-4">
          <p className="section-title mb-4">Budget vs Actual Hours</p>
          {budgetData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <>
              {/* Custom legend – top right, matching the mockup */}
              <div className="flex items-center justify-end gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-primary" />
                  Budget Hours
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-primary-200" />
                  Actual Hours
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={budgetData}
                  margin={{ top: 4, right: 4, left: 8, bottom: 4 }}
                  barCategoryGap="24%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="project_name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    interval={budgetData.length > 8 ? 'preserveStartEnd' : 0}
                    height={15}
                    tickFormatter={(value) =>
                      value.length > 10 ? `${value.substring(0, 10)}…` : value
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                    domain={[0, budgetTickStep * 4]}
                    ticks={budgetTicks}
                    width={35}
                    allowDecimals={false}
                    interval={0}
                    tickMargin={8}
                  />
                  <Tooltip content={<BudgetTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="budget_hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={800} />
                  <Bar dataKey="actual_hours" fill="#c7d2fe" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <p className="section-title mb-0">Recent Activity</p>
          </div>
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-400 text-center">No activity yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-50 flex-1">
                {visibleActivity.map(item => {
                  const cfg = ACTIVITY_CFG[item.type];
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
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
              {hasMoreActivity && (
                <button
                  onClick={() => setActivityExpanded(v => !v)}
                  className="w-full px-4 py-2.5 text-xs text-slate-500 hover:text-primary border-t border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  {activityExpanded
                    ? <><ChevronUp size={12} /> Show less</>
                    : <><ChevronDown size={12} /> {activity.length - ACTIVITY_LIMIT} more</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Designer Util + Tasks by Status + Upcoming Deadlines ─────── */}
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">

        {/* Designer Utilisation */}
        <div className="card p-5">
          <p className="section-title mb-4">Designer Utilisation</p>
          {sortedUtilization.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No designers found</p>
          ) : (
            <div className="space-y-4">
              {sortedUtilization.map(d => {
                const pct = d.utilization_pct!;
                return (
                  <div key={d.designer_id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <button
                        onClick={() => setSelectedDesigner({ id: d.designer_user_id, name: d.designer_name })}
                        className="text-sm text-slate-700 font-medium truncate max-w-[130px] hover:text-primary transition-colors text-left"
                      >
                        {d.designer_name}
                      </button>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {pct.toFixed(0)}%
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

        {/* Tasks by Status — donut with center total */}
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
                    <Label
                      content={({ viewBox }) => {
                        const vb = viewBox as { cx?: number; cy?: number };
                        const cx = vb.cx ?? 65;
                        const cy = vb.cy ?? 65;
                        return (
                          <g>
                            <text
                              x={cx} y={cy - 5}
                              textAnchor="middle" dominantBaseline="middle"
                              style={{ fontSize: 16, fontWeight: 700, fill: '#0f172a', fontFamily: 'Inter, sans-serif' }}
                            >
                              {allTasks.length}
                            </text>
                            <text
                              x={cx} y={cy + 11}
                              textAnchor="middle" dominantBaseline="middle"
                              style={{ fontSize: 8.5, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}
                            >
                              Total
                            </text>
                          </g>
                        );
                      }}
                    />
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

      {/* ── Row 4: Active Projects table ─────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="section-title mb-0">Active Projects</p>
          <Link
            to="/manager/projects"
            className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
          >
            View all →
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">No active projects.</p>
        ) : (
          <>
             <div className={`grid ${activeProjectGrid} gap-4 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100`}>
               <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Project</span>
               <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Budget</span>
               <span className="-ml-8 justify-self-start text-[10px] font-semibold uppercase tracking-wide text-slate-400">EHR</span>
               <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Deadline</span>
             </div>
            <ul className="divide-y divide-slate-100">
              {activeProjects.map(p => {
                const pct =
                  p.budget_hours && p.actual_hours != null
                    ? Math.round((p.actual_hours / Number(p.budget_hours)) * 100)
                    : null;
                const ehr =
                  p.budget_amount && p.actual_hours > 0
                    ? Number(p.budget_amount) / p.actual_hours
                    : null;
                const isOver =
                  p.budget_hours != null && p.actual_hours > Number(p.budget_hours);

                return (
                  <li key={p.id}>
                    <Link
                      to={`/manager/projects/${p.id}`}
                      className={`grid ${activeProjectGrid} gap-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors`}
                    >
                      {/* Project */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.project_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{p.client_name}</span>
                          {p.category && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryClass(p.category)}`}
                            >
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="h-1.5 w-16 shrink-0 rounded-full bg-slate-100 overflow-hidden">
                          {pct !== null && (
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: barColor(pct),
                              }}
                            />
                          )}
                        </div>
                        {pct !== null ? (
                          <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                            {Math.round(p.actual_hours)}/{Math.round(Number(p.budget_hours))}h
                            {isOver && <span className="ml-0.5 text-rose-500">↑</span>}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-300 whitespace-nowrap">—</span>
                        )}
                      </div>

                      {/* EHR */}
                      <div className="-ml-14 justify-self-start text-left">
                        {ehr !== null ? (
                          <span
                            className={`font-mono text-xs font-bold ${isOver ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                          >
                            {formatEHR(ehr)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-300">—</span>
                        )}
                      </div>

                      {/* Deadline */}
                      <div className="text-right">
                        {p.deadline ? (
                          <span className="text-xs text-slate-500">{p.deadline}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
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

      {selectedDesigner && (
        <ActivityModal
          designerUserId={selectedDesigner.id}
          designerName={selectedDesigner.name}
          onClose={() => setSelectedDesigner(null)}
        />
      )}
    </AppShell>
  );
}
