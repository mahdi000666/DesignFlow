import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useProjects, useCreateProject } from '../../hooks/useProjects';
import ProjectForm from '../../components/ProjectForm';
import AppShell from '../../components/AppShell';
import type { Project, ProjectPayload } from '../../types/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-success-light text-success',
  Completed: 'bg-surface2 text-ink3',
  OnHold:    'bg-amber-light text-amber-dark',
};

const barColor = (pct: number) =>
  pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-amber' : 'bg-teal';

const formatTND = (n: number) =>
  `${Math.round(n).toLocaleString()} TND`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectList() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showForm,     setShowForm]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'All'>('All');
  const [clientFilter, setClientFilter] = useState('All');

  const uniqueClients = useMemo(
    () => Array.from(new Set(projects.map(p => p.client_name))).sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      const matchSearch = !q || p.project_name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchClient = clientFilter === 'All' || p.client_name === clientFilter;
      return matchSearch && matchStatus && matchClient;
    });
  }, [projects, search, statusFilter, clientFilter]);

  const handleCreate = (payload: ProjectPayload) => {
    createProject.mutate(payload, { onSuccess: () => setShowForm(false) });
  };

  const selectCls =
    'px-[14px] py-[6px] rounded bg-surface font-sans text-[12px] text-ink2 border border-border-strong outline-none focus:border-amber hover:bg-surface2 cursor-pointer transition-colors';

  return (
    <AppShell
      title="Projects"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-[14px] py-[6px] rounded bg-ink text-white font-sans text-[12px] font-medium border border-ink hover:bg-[#333] transition-colors"
        >
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      }
    >
      {/* Inline create form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-6">
          <h3 className="font-serif text-[17px] font-normal text-ink mb-4">Create project</h3>
          <ProjectForm onSubmit={handleCreate} isLoading={createProject.isPending} />
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 text-[13px]">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-9 pr-4 py-[6px] border border-border-strong rounded bg-surface font-sans text-[13px] text-ink outline-none focus:border-amber transition-colors placeholder:text-ink3 w-52"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className={selectCls}>
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="OnHold">On Hold</option>
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className={selectCls}>
          <option value="All">All clients</option>
          {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="font-sans text-[13px] text-ink3">Loading projects…</p>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                {['Project', 'Client', 'Budget', 'Budget Hrs', 'Logged Hrs', 'Utilisation', 'Deadline', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center font-sans text-[13px] text-ink3">
                    {search || statusFilter !== 'All' || clientFilter !== 'All'
                      ? 'No projects match the current filters.'
                      : 'No projects yet. Create one above.'}
                  </td>
                </tr>
              )}
              {filtered.map(p => {
                const budgetPct = p.budget_hours && p.actual_hours != null
                  ? Math.round((p.actual_hours / Number(p.budget_hours)) * 100)
                  : null;
                return (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-bg transition-colors">
                    <td className="px-4 py-[13px]">
                      <Link to={`/manager/projects/${p.id}`} className="font-sans text-[13px] font-medium text-amber hover:underline underline-offset-2">
                        {p.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-[13px] font-sans text-[13px] text-ink2">{p.client_name}</td>
                    <td className="px-4 py-[13px] font-mono text-[13px] text-ink whitespace-nowrap">
                      {p.budget_amount != null ? formatTND(Number(p.budget_amount)) : <span className="text-ink3">—</span>}
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[13px] text-ink">
                      {p.budget_hours != null ? `${p.budget_hours}h` : <span className="text-ink3">—</span>}
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[13px] text-ink">{p.actual_hours}h</td>
                    <td className="px-4 py-[13px]">
                      {budgetPct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-[4px] bg-surface2 rounded-full overflow-hidden shrink-0">
                            <div className={`h-full rounded-full ${barColor(budgetPct)}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                          </div>
                          <span className="font-mono text-[12px] text-ink2">{budgetPct}%</span>
                        </div>
                      ) : <span className="font-sans text-[13px] text-ink3">—</span>}
                    </td>
                    <td className="px-4 py-[13px] font-sans text-[13px] text-ink2 whitespace-nowrap">
                      {p.deadline ?? <span className="text-ink3">—</span>}
                    </td>
                    <td className="px-4 py-[13px]">
                      <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${STATUS_BADGE[p.status]}`}>
                        {p.status}
                      </span>
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