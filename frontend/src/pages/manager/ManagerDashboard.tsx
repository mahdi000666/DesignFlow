import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useKPISummary } from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import { getAllTimeLogs } from '../../api/timelogs';
import { getAllFiles } from '../../api/files';
import { getAllCompletedTasks } from '../../api/tasks';
import AppShell from '../../components/AppShell';
import { useMemo } from 'react';
import { formatTND } from '../../utils/format';
import { barColor, CATEGORY_PALETTE } from '../../utils/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const FEEDBACK_CAT_STYLE: Record<string, { bg: string; text: string }> = {
  Revision: { bg: '#fff7ed', text: '#c2410c' },
  Approval: { bg: '#f0fdf4', text: '#15803d' },
  Question: { bg: '#eff6ff', text: '#1d4ed8' },
};

const FEEDBACK_STATUS_CLS: Record<string, string> = {
  Pending:    'text-amber-700 bg-amber-50',
  InProgress: 'text-blue-700 bg-blue-50',
  Resolved:   'text-emerald-700 bg-emerald-50',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { user }                = useAuth();
  const { data: kpi }           = useKPISummary();
  const { data: projects = [] } = useProjects();

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback-all'],
    queryFn:  getAllFeedback,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['timelogs-all'],
    queryFn:  getAllTimeLogs,
  });

  const { data: allFiles = [] } = useQuery({
    queryKey: ['files-all'],
    queryFn:  getAllFiles,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['tasks-completed'],
    queryFn:  getAllCompletedTasks,
  });

  const categoryColorMap = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(projects.map(p => p.category).filter((c): c is string => Boolean(c)))
    ).sort();
    return new Map(
      uniqueCategories.map((cat, i) => [cat, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]])
    );
  }, [projects]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const activeProjects = projects.filter(p => p.status === 'Active').slice(0, 5);

  const latestFeedback = [...allFeedback]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 5);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const hoursThisWeek = allLogs
    .filter(l => new Date(l.created_at) >= weekStart)
    .reduce((sum, l) => sum + Number(l.hours_spent), 0);

  const today = new Date();
  const soonDate = new Date();
  soonDate.setDate(today.getDate() + 14);
  const atRiskCount = projects.filter(p => {
    if (p.status !== 'Active') return false;
    const pct = p.budget_hours && p.actual_hours != null
      ? (p.actual_hours / Number(p.budget_hours)) * 100
      : 0;
    const deadlineSoon = p.deadline ? new Date(p.deadline) <= soonDate : false;
    return pct >= 80 || deadlineSoon;
  }).length;

  const projectNameById = Object.fromEntries(projects.map(p => [p.id, p.project_name]));

  type ActivityItem = { id: string; type: 'log' | 'file' | 'task'; label: string; sub: string; date: string };
  const activity: ActivityItem[] = [
    ...allLogs.map(l => ({
      id:    `log-${l.id}`,
      type:  'log' as const,
      label: `${l.designer_name} logged ${Number(l.hours_spent)}h on ${l.task_name}`,
      sub:   l.project_name,
      date:  l.created_at,
    })),
    ...allFiles.map(f => ({
      id:    `file-${f.id}`,
      type:  'file' as const,
      label: `${f.uploaded_by_name} uploaded ${f.file_name}`,
      sub:   projectNameById[f.project] ?? '—',
      date:  f.uploaded_at,
    })),
    ...completedTasks
      .filter(t => t.completed_at !== null)
      .map(t => ({
        id:    `task-${t.id}`,
        type:  'task' as const,
        label: `Task ${t.task_name} marked as completed`,
        sub:   t.project_name,
        date:  t.completed_at!,
      })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  // ── KPI cards ─────────────────────────────────────────────────────────────

  const KPI_CARDS = [
    { label: 'Active Projects',       value: kpi ? String(kpi.active_projects)      : '—', rail: 'bg-blue-500'    },
    { label: 'Total Revenue',         value: kpi ? formatTND(kpi.total_revenue)      : '—', rail: 'bg-emerald-500' },
    { label: 'Avg. EHR',              value: kpi ? `${kpi.avg_ehr.toFixed(2)} TND/h` : '—', rail: 'bg-yellow-500'  },
    { label: 'Pending Feedback',      value: kpi ? String(kpi.pending_feedback)      : '—', rail: 'bg-rose-500'    },
    { label: 'Hours Logged This Week', value: `${hoursThisWeek.toFixed(1)}h`,                rail: 'bg-violet-500'  },
    { label: 'At-risk Projects',      value: String(atRiskCount),                            rail: 'bg-orange-500'  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-slate-900">
          Welcome back, {user?.full_name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">Here's an overview of your agency today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {KPI_CARDS.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-5 pr-5 py-5"
          >
            <div className={`absolute left-0 inset-y-0 w-1 ${card.rail}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {card.label}
            </p>
            <p className="font-mono text-2xl font-bold text-slate-900 leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Active Projects + Recent Feedback */}
      <div className="grid grid-cols-3 gap-4 mb-4">

        {/* Active Projects */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Active Projects</p>
            <Link
              to="/manager/projects"
              className="text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors"
            >
              View all →
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No active projects.</p>
          ) : (
            <>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_140px_80px_90px] gap-4 px-5 py-2 border-b border-slate-100">
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
                      ? Math.round(Number(p.budget_amount) / p.actual_hours)
                      : null;
                    const isOver = p.budget_hours != null && p.actual_hours > Number(p.budget_hours);
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/manager/projects/${p.id}`}
                          className="grid grid-cols-[1fr_140px_80px_90px] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{p.project_name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500">{p.client_name}</span>
                              {p.category && (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryColorMap.get(p.category) ?? 'bg-slate-50 text-slate-700'}`}>
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Budget bar + hours */}
                          <div className="flex items-center gap-2">
                            {pct !== null ? (
                              <>
                                <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor(pct) }} />
                                </div>
                                <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                                  {Math.round(p.actual_hours)}/{Math.round(Number(p.budget_hours))}h
                                  {isOver && <span className="ml-0.5 text-rose-500">↑</span>}
                                </span>
                              </>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </div>
                          {/* EHR */}
                          <div className="text-right">
                            {ehr !== null
                              ? <span className={`font-mono text-sm font-bold ${isOver ? 'text-rose-600' : 'text-emerald-700'}`}>{ehr} TND/h</span>
                              : <span className="text-slate-300 text-sm">—</span>}
                          </div>
                          {/* Deadline */}
                          <div className="text-right">
                            {p.deadline
                              ? <span className="text-xs text-slate-400">{p.deadline}</span>
                              : <span className="text-slate-300 text-sm">—</span>}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Recent Feedback</p>
          </div>
          {latestFeedback.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No feedback yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {latestFeedback.map(f => {
                const catStyle = FEEDBACK_CAT_STYLE[f.category] ?? { bg: '#f1f5f9', text: '#475569' };
                return (
                  <li key={f.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                      >
                        {f.category}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${FEEDBACK_STATUS_CLS[f.status] ?? ''}`}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 mt-1">{f.content_text}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400 truncate">{f.project_name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{timeAgo(f.submitted_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map(item => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  item.type === 'log'  ? 'bg-blue-50'    :
                  item.type === 'file' ? 'bg-teal-50'    :
                                        'bg-emerald-50'
                }`}>
                  {item.type === 'log' && (
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="text-blue-700">
                      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M7.5 4.5V7.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  )}
                  {item.type === 'file' && (
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="text-teal-700">
                      <path d="M3.5 13.5h8a1 1 0 001-1v-9l-3-3h-6a1 1 0 00-1 1v11a1 1 0 001 1z" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  )}
                  {item.type === 'task' && (
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="text-emerald-700">
                      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5 7.5l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-snug">{item.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(item.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
