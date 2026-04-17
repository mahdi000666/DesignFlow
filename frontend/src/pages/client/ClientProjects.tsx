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

const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientProjects() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <AppShell title="My Projects" breadcrumb="Projects">
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-16 text-center">
          <p className="text-sm text-slate-400">No projects yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Project', 'Status', 'Deadline', 'Budget used', 'Category'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map(p => {
                const pct = p.budget_hours && p.actual_hours != null
                  ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
                  : null;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        to={`/client/projects/${p.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-blue-700 transition-colors"
                      >
                        {p.project_name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        {p.status === 'OnHold' ? 'On Hold' : p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {fmtDate(p.deadline)}
                    </td>
                    <td className="px-5 py-4 w-48">
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: barColor(pct) }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-600 whitespace-nowrap">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {p.category || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}