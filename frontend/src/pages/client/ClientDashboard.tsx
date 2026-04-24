import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import AppShell from '../../components/AppShell';
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

const fmtTND = (v: number) =>
  `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')} TND`;

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

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useProjects();

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback-all'],
    queryFn:  getAllFeedback,
  });

  // ── KPI values ────────────────────────────────────────────────────────────

  const totalContractValue = projects.reduce(
    (sum, p) => sum + (p.budget_amount != null ? Number(p.budget_amount) : 0), 0,
  );

  const pendingFeedback = allFeedback.filter(
    f => f.status === 'Pending' || f.status === 'InProgress',
  ).length;

  const activeProjects = projects.filter(p => p.status === 'Active').length;

  // Open feedback count per project (for badges on cards)
  const openFeedbackByProject = useMemo(() => {
    const map: Record<number, number> = {};
    for (const f of allFeedback) {
      if (f.status !== 'Resolved') {
        map[f.project] = (map[f.project] ?? 0) + 1;
      }
    }
    return map;
  }, [allFeedback]);

  return (
    <AppShell title="Dashboard">
      <div className="mb-5">
        <p className="text-sm text-slate-500">Welcome back, <span className="font-medium text-slate-700">{user?.full_name}</span></p>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard
          label="My Projects"
          value={projects.length}
          subtitle={`${activeProjects} active`}
          borderColor="#3b82f6"
        />
        <KPICard
          label="Pending Feedback"
          value={pendingFeedback}
          subtitle="awaiting response"
          borderColor="#f59e0b"
        />
        <KPICard
          label="Total Contract Value"
          value={fmtTND(totalContractValue)}
          subtitle="across all projects"
          borderColor="#10b981"
        />
      </div>

      {/* ── Project list ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Projects</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400 px-5 py-6">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-10 text-center">No projects yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map(p => {
              const pct = p.budget_hours && p.actual_hours != null
                ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
                : null;
              const openCount = openFeedbackByProject[p.id] ?? 0;

              return (
                <Link
                  key={p.id}
                  to={`/client/projects/${p.id}`}
                  className="block px-5 py-4 hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.project_name}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                        {p.status === 'OnHold' ? 'On Hold' : p.status}
                      </span>
                    </div>
                    {openCount > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {openCount} open feedback
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <p className="text-xs text-slate-400 mb-2">
                    {[p.category, p.deadline ? `Due ${p.deadline}` : null].filter(Boolean).join(' · ')}
                  </p>

                  {/* Progress row */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      {pct !== null ? (
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                      ) : (
                        <div className="h-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.budget_hours ? (
                        <span className="font-mono text-xs text-slate-500">
                          {Math.round(p.actual_hours)} / {Math.round(Number(p.budget_hours))} h
                        </span>
                      ) : null}
                      {p.budget_amount != null && (
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {fmtTND(Number(p.budget_amount))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-1">{p.description}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}