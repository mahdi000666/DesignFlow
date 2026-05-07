import { Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import AppShell from '../../components/AppShell';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';

export default function DesignerProjects() {
  const { data: projects, isLoading } = useProjects();

  return (
    <AppShell title="My Projects">
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects?.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-10 text-center">
          <p className="text-sm text-slate-400">You have not been assigned to any projects yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects?.map(p => {
            const budgetPct = p.budget_hours && p.actual_hours != null
              ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
              : null;

            const meta = [
              p.client_name,
              p.deadline ? `Due ${p.deadline}` : null,
            ].filter(Boolean).join(' · ');

            return (
              <Link
                key={p.id}
                to={`/designer/projects/${p.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-xs transition-all block group"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                        {p.project_name}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {meta && <p className="text-sm text-slate-700">{meta}</p>}
                    </div>
                    {p.category && (
                      <div className="mt-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryClass(p.category)}`}>
                          {p.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    {budgetPct !== null ? (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${budgetPct}%`, backgroundColor: barColor(budgetPct) }}
                      />
                    ) : (
                      <div className="h-full" />
                    )}
                  </div>
                  {p.budget_hours ? (
                    <span className="font-mono text-xs text-slate-500 shrink-0">
                      {Math.round(p.actual_hours)} / {Math.round(Number(p.budget_hours))} h
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 shrink-0">No budget set</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}