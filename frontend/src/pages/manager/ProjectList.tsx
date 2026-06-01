import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects, useCreateProject } from '../../hooks/useProjects';
import { useProfitMargin, useScopeCreep } from '../../hooks/useAnalytics';
import ProjectForm from '../../components/ProjectForm';
import AppShell from '../../components/AppShell';
import apiClient from '../../api/clients';
import type { Project, ProjectPayload } from '../../types/project';
import type { ScopeCreepItem } from '../../types/analytic';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import { formatEHR } from '../../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<Project['status'], Project['status']> = {
  Active:    'Completed',
  Completed: 'OnHold',
  OnHold:    'Active',
};

const scColor = (pct: number) =>
  pct === 0 ? 'text-slate-400' : pct <= 20 ? 'text-amber-600' : 'text-rose-600';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectList() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: profitMargin = [] } = useProfitMargin();
  const { data: scopeCreepData = [] }      = useScopeCreep();
  const createProject = useCreateProject();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const [showForm,     setShowForm]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'All'>('All');
  const [clientFilter, setClientFilter] = useState('All');

  const cycleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Project['status'] }) => {
      const { data } = await apiClient.patch(`/projects/${id}/`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<Project[]>(['projects']);
      queryClient.setQueryData<Project[]>(['projects'], old =>
        old?.map(p => p.id === id ? { ...p, status } : p) ?? [] // 	For each project p: if it's the one we just updated, return a new object with the new status; otherwise return it unchanged.
        // Spread: copy all properties from the old project (...p), then overwrite status with the new value.
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
        // If the search box is empty, return true otherwise check if the project name OR client name contains what the user typed.
        const matchSearch = !q || p.project_name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
        // Check if the uesr selected 'All' otherwise check if the project status or client name is equal to the chosen filter
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
    'px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer transition-colors hover:bg-slate-50';

  return (
    <AppShell
      title="Projects"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className={
            showForm
              ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
              : 'bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors'
          }
        >
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      }
    >
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Create project</h3>
          <ProjectForm onSubmit={handleCreate} isLoading={createProject.isPending} />
        </div>
      )}

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
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-900 outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-slate-400 w-52"
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

                const sc = scopeCreepMap.get(p.id);
                const scPct = sc != null ? sc.index : null;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/manager/projects/${p.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                        {p.project_name}
                      </span>
                      {p.category && (
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryClass(p.category)}`}>
                            {p.category}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-600">{p.client_name}</td>

                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => cycleStatus.mutate({ id: p.id, status: STATUS_CYCLE[p.status] })}
                        disabled={cycleStatus.isPending}
                        title="Click to change status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-75 disabled:opacity-40 ${STATUS_BADGE[p.status]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
                        {statusLabel(p.status)}
                      </button>
                    </td>

                                        <td className="px-4 py-3.5">
                      {(() => {
                        const pm = profitMargin.find(r => r.project_id === p.id);
                        if (!pm || pm.ehr == null) {
                          return <span className="text-slate-300 text-sm">—</span>;
                        }
                        const target = pm.target_ehr;
                        const isCompleted = p.status === 'Completed';
                        const val = isCompleted ? pm.ehr : (pm.projected_ehr ?? pm.ehr);
                        if (val == null) return <span className="text-slate-300 text-sm">—</span>;
                        const cls = target != null && val >= target ? 'text-emerald-700' : 'text-rose-600';
                        const title = isCompleted
                          ? `Final EHR vs target ${formatEHR(target ?? 0)}`
                          : `Projected final EHR vs target ${formatEHR(target ?? 0)}`;
                        return (
                          <span
                            className={`font-mono text-sm font-semibold ${cls}`}
                            title={title}
                          >
                            {formatEHR(val)}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3.5">
                      {scPct !== null ? (
                        <span className={`font-mono text-sm font-semibold ${scColor(scPct)}`}>
                          {scPct}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>

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