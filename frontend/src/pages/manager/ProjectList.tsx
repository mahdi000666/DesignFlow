import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useProjects, useCreateProject } from '../../hooks/useProjects';
import ProjectForm from '../../components/ProjectForm';
import AppShell from '../../components/AppShell';
import type { Project, ProjectPayload } from '../../types/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Project['status'], string> = {
  // Now matches Task 'InProgress' (Blue)
  Active:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200', 
  // Now matches Task 'Completed' (Green)
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', 
  // Stays distinct or matches 'Todo' (Violet/Gray)
  OnHold:    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200', 
};

const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-blue-500',
  Completed: 'bg-emerald-500',
  OnHold:    'bg-violet-500',
};

const CATEGORY_COLORS = [
  'bg-purple-50 text-purple-700',
  'bg-blue-50 text-blue-700',
  'bg-teal-50 text-teal-700',
  'bg-orange-50 text-orange-700',
  'bg-pink-50 text-pink-700',
  'bg-indigo-50 text-indigo-700',
  'bg-cyan-50 text-cyan-700',
  'bg-rose-50 text-rose-700',
];

const categoryColor = (cat: string) => {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
};

const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

const formatTND = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')} TND`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectList() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();
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
    'px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-colors hover:bg-slate-50';

  return (
    <AppShell
      title="Projects"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className={
            showForm
              ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
              : 'bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors'
          }
        >
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      }
    >
      {/* Inline create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Create project</h3>
          <ProjectForm onSubmit={handleCreate} isLoading={createProject.isPending} />
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-5 flex-wrap">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="14" height="14" viewBox="0 0 15 15" fill="none"
          >
            <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.7 3.8l2.9 2.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400 w-52"
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
        <p className="text-sm text-slate-400">Loading projects…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Project', 'Client', 'Budget', 'Budget Hrs', 'Logged Hrs', 'Utilisation', 'Deadline', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
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
                  <tr key={p.id} onClick={() => navigate(`/manager/projects/${p.id}`)} className="hover:bg-slate-50/70 transition-colors cursor-pointer group">
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.project_name}
                      </span>
                      {p.category && (
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryColor(p.category)}`}>
                            {p.category}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{p.client_name}</td>
                    <td className="px-4 py-3.5 font-mono text-sm text-slate-900 whitespace-nowrap">
                      {p.budget_amount != null ? formatTND(Number(p.budget_amount)) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm text-slate-900">
                      {p.budget_hours != null ? `${p.budget_hours}h` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm text-slate-900">{p.actual_hours}h</td>
                    <td className="px-4 py-3.5">
                      {budgetPct !== null ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: barColor(budgetPct) }}
                              />
                          </div>
                          <span className="font-mono text-xs text-slate-600">{budgetPct}%</span>
                        </div>
                      ) : <span className="text-sm text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {p.deadline ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
                        {p.status === 'OnHold' ? 'On Hold' : p.status}
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