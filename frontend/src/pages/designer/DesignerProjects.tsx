import { Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import AppShell from '../../components/AppShell';
import type { Project } from '../../types/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  OnHold:    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
};

const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-blue-500',
  Completed: 'bg-emerald-500',
  OnHold:    'bg-violet-500',
};

const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

// ─── Component ───────────────────────────────────────────────────────────────

export default function DesignerProjects() {
  // The backend already filters to assigned-only for the Designer role.
  const { data: projects, isLoading } = useProjects();

  return (
    <AppShell title="My Projects">
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects?.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-10 text-center">
          <p className="text-sm text-slate-400">
            You have not been assigned to any projects yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects?.map(p => {
            const budgetPct = p.budget_hours
              ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
              : null;

            return (
              <Link
                key={p.id}
                to={`/designer/projects/${p.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block group"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-base font-semibold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                    {p.project_name}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
                    {p.status === 'OnHold' ? 'On Hold' : p.status}
                  </span>
                </div>

                {/* Client */}
                <p className="text-sm text-slate-500 mb-3">{p.client_name}</p>

                {/* Budget progress */}
                {budgetPct !== null && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Budget</span>
                      <span className="font-mono">{p.actual_hours}h / {p.budget_hours}h</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: barColor(budgetPct) }}
                      />
                    </div>
                  </div>
                )}

                {/* Deadline */}
                {p.deadline && (
                  <p className="text-xs text-slate-400 mt-2">
                    Due <span className="text-slate-600">{p.deadline}</span>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}