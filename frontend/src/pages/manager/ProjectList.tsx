import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects, useCreateProject } from '../../hooks/useProjects';
import { useScopeCreep } from '../../hooks/useAnalytics';
import ProjectForm from '../../components/ProjectForm';
import AppShell from '../../components/AppShell';
import apiClient from '../../api/clients';
import type { Project, ProjectPayload } from '../../types/project';
import type { ScopeCreepItem } from '../../types/analytic';

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

const STATUS_CYCLE: Record<Project['status'], Project['status']> = {
  Active:    'Completed',
  Completed: 'OnHold',
  OnHold:    'Active',
};

const CATEGORY_COLORS = [
  'bg-purple-50 text-purple-700',
  'bg-blue-50 text-blue-700',
  'bg-orange-50 text-orange-700',
  'bg-pink-50 text-pink-700',
  'bg-cyan-50 text-cyan-700',
  'bg-rose-50 text-rose-700',
];

// Budget bar: teal < 80%, amber 80–99%, red ≥ 100%
const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

// EHR: red if over budget, emerald otherwise
const ehrColor = (actualHours: number, budgetHours: number | null) => {
  if (budgetHours == null) return 'text-emerald-700';
  return actualHours > Number(budgetHours) ? 'text-rose-600' : 'text-emerald-700';
};

// Scope creep: amber low, red high
const scColor = (pct: number) =>
  pct === 0 ? 'text-slate-400' : pct <= 20 ? 'text-amber-600' : 'text-rose-600';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectList() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: scopeCreepData = [] }      = useScopeCreep();
  const createProject = useCreateProject();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const [showForm,     setShowForm]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'All'>('All');
  const [clientFilter, setClientFilter] = useState('All');

  // Status cycle mutation — updates any project without pre-binding projectId
  const cycleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Project['status'] }) => {
      const { data } = await apiClient.patch(`/projects/${id}/`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<Project[]>(['projects']);
      queryClient.setQueryData<Project[]>(['projects'], old =>
        old?.map(p => p.id === id ? { ...p, status } : p) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['projects'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const uniqueClients = useMemo(
    () => Array.from(new Set(projects.map(p => p.client_name))).sort(),
    [projects]
  );

  const categoryColorMap = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(projects.map(p => p.category).filter((c): c is string => Boolean(c)))
    ).sort();
    return new Map(uniqueCategories.map((cat, i) => [cat, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]));
  }, [projects]);

  // Scope creep by project_id — field name assumed from backend serializer
  const scopeCreepMap = useMemo(() => {
    const map = new Map<number, { index: number; unplanned: number; total: number }>();
    (scopeCreepData as ScopeCreepItem[]).forEach(sc => {
      map.set(sc.project_id, {
        index: Math.round(sc.scope_creep_index),
        unplanned: sc.unplanned_tasks,
        total: sc.total_tasks,
      });
    });
    return map;
  }, [scopeCreepData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects
      .filter(p => {
        const matchSearch = !q || p.project_name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchClient = clientFilter === 'All' || p.client_name === clientFilter;
        return matchSearch && matchStatus && matchClient;
      })
      .sort((a, b) => a.id - b.id);
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

      {/* Filter bar */}
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

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading projects…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Project', 'Client', 'Status', 'EHR', 'Scope Creep', 'Utilisation', 'Deadline'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
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

                const ehr = p.budget_amount && p.actual_hours > 0
                  ? Number(p.budget_amount) / p.actual_hours
                  : null;

                const isOver = p.budget_hours != null && p.actual_hours > Number(p.budget_hours);

                const sc = scopeCreepMap.get(p.id);
                const scPct = sc != null ? sc.index : null;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/manager/projects/${p.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Project name + category */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.project_name}
                      </span>
                      {p.category && (
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryColorMap.get(p.category) ?? 'bg-slate-50 text-slate-700'}`}>
                            {p.category}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3.5 text-sm text-slate-600">{p.client_name}</td>

                    {/* Status — clickable, cycles through statuses */}
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => cycleStatus.mutate({ id: p.id, status: STATUS_CYCLE[p.status] })}
                        disabled={cycleStatus.isPending}
                        title="Click to change status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-75 disabled:opacity-40 ${STATUS_BADGE[p.status]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
                        {p.status === 'OnHold' ? 'On Hold' : p.status}
                      </button>
                    </td>

                    {/* EHR */}
                    <td className="px-4 py-3.5">
                      {ehr !== null ? (
                        <span className={`font-mono text-sm font-semibold ${ehrColor(p.actual_hours, p.budget_hours)}`}>
                          {isOver && <span className="mr-0.5">↑</span>}
                          {Math.round(ehr)} TND/h
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Scope Creep */}
                    <td className="px-4 py-3.5">
                      {scPct !== null ? (
                        <span className={`font-mono text-sm font-semibold ${scColor(scPct)}`}>
                          {scPct}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Budget utilisation bar */}
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
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {p.deadline ?? <span className="text-slate-300">—</span>}
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