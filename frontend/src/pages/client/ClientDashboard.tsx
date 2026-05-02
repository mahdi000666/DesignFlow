import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import { formatTND } from '../../utils/format';
import {
  FolderOpen, MessageSquare, DollarSign,
  Calendar,
} from 'lucide-react';

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
      <div className="flex justify-center mb-4">
        <div className="grid grid-cols-3 gap-3.5">
          <KpiCard
            label="My Projects"
            value={projects.length}
            icon={<FolderOpen size={15} />}
          />
          <KpiCard
            label="Pending Feedback"
            value={pendingFeedback}
            icon={<MessageSquare size={15} />}
          />
          <KpiCard
            label="Total Contract Value"
            value={formatTND(totalContractValue)}
            icon={<DollarSign size={15} />}
          />
        </div>
      </div>

      {/* ── Project list ──────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="section-title mb-0">My Projects</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400 px-4 py-6">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-10 text-center">No projects yet.</p>
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
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                        {p.project_name}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    {openCount > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {openCount} Open feedback
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    {p.category && (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryClass(p.category)}`}>
                        {p.category}
                      </span>
                    )}
                    {p.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Calendar size={11} />
                        Due {p.deadline}
                      </span>
                    )}
                  </div>

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
                          {formatTND(Number(p.budget_amount))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">{p.description}</p>
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
