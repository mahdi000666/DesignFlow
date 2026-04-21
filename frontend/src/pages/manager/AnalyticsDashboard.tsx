import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import AppShell from '../../components/AppShell';
import {
  useKPISummary,
  useBudgetVariance,
  useRevenueByClient,
  useClientProfitability,
  useScopeCreep,
  useDesignerUtilization,
  useCumulativeHours,
  useProfitMargin,
} from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import type { AnalyticsFilters } from '../../types/analytic';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const utilBarColor = (pct: number) =>
  pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters:  AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
  projects: { id: number; project_name: string }[];
}

function FilterBar({ filters, onChange, projects }: FilterBarProps) {
  const selectCls =
    'px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-colors hover:bg-slate-50';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">From</label>
        <input
          type="date"
          value={filters.date_from ?? ''}
          onChange={e => onChange({ ...filters, date_from: e.target.value || undefined })}
          className={selectCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">To</label>
        <input
          type="date"
          value={filters.date_to ?? ''}
          onChange={e => onChange({ ...filters, date_to: e.target.value || undefined })}
          className={selectCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</label>
        <select
          value={filters.project ?? ''}
          onChange={e => onChange({ ...filters, project: e.target.value ? Number(e.target.value) : undefined })}
          className={selectCls}
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onChange({})}
        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilters>({});

  const { data: projects = [] }      = useProjects();
  const { data: kpi }                = useKPISummary(filters);
  const { data: budgetData = [] }    = useBudgetVariance(filters);
  const { data: revenueData = [] }   = useRevenueByClient();
  const { data: profitability = [] } = useClientProfitability();
  const { data: scopeCreep = [] }    = useScopeCreep(filters);
  const { data: utilization = [] }   = useDesignerUtilization(filters);
  const { data: cumulativeHours, isLoading: loadingCumulative } = useCumulativeHours(filters);
  const { data: profitMargin = [] }  = useProfitMargin(filters);

  const hasProjectFilter = !!filters.project;

  return (
    <AppShell title="Analytics" breadcrumb="Analytics">

      <FilterBar filters={filters} onChange={setFilters} projects={projects} />

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue',    value: kpi ? kpi.total_revenue.toLocaleString() : '—', rail: 'bg-emerald-500' },
          { label: 'Avg. EHR',         value: kpi ? kpi.avg_ehr.toFixed(2)             : '—', rail: 'bg-blue-500' },
          { label: 'Active Projects',  value: kpi ? String(kpi.active_projects)         : '—', rail: 'bg-amber-500' },
          { label: 'Pending Feedback', value: kpi ? String(kpi.pending_feedback)        : '—', rail: 'bg-rose-500' },
        ].map(card => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-5 pr-5 py-5"
          >
            <div className={`absolute left-0 inset-y-0 w-1 ${card.rail}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{card.label}</p>
            <p className="font-mono text-3xl font-bold text-slate-900 leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Budget vs Actual + Revenue by Client ─────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Budget vs Actual Hours
          </p>
          {budgetData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgetData} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="project_name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="budget_hours"    name="Budget h"    fill="#1e40af" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual_hours"    name="Actual h"    fill="#60a5fa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="estimated_hours" name="Estimated h" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Revenue by Client
          </p>
          {revenueData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={revenueData}
                  dataKey="total_revenue"
                  nameKey="client_name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {revenueData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined) => v?.toLocaleString() ?? '—'}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Cumulative hours line chart (project-scoped) ─────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Cumulative Hours Over Time
          {!hasProjectFilter && (
            <span className="ml-2 normal-case font-normal text-slate-300">— select a project above</span>
          )}
        </p>
        {hasProjectFilter ? (
          loadingCumulative ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : cumulativeHours && cumulativeHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cumulativeHours} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="cumulative_hours"
                  name="Cumulative h"
                  stroke="#1e40af"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">
              No time logs yet for this project.
            </div>
          )
        ) : (
          <div className="h-44 flex items-center justify-center text-sm text-slate-300">
            Choose a project from the filter bar to see the time trend
          </div>
        )}
      </div>

      {/* ── Row 2: Scope Creep + Designer Utilisation ───────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Scope Creep Index
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left   text-xs font-semibold text-slate-400">Project</th>
                <th className="pb-2 text-right  text-xs font-semibold text-slate-400">Total</th>
                <th className="pb-2 text-right  text-xs font-semibold text-slate-400">Unplanned</th>
                <th className="pb-2 text-right  text-xs font-semibold text-slate-400">Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {scopeCreep.map(row => (
                <tr key={row.project_id}>
                  <td className="py-2 pr-3 text-slate-700 font-medium truncate max-w-[130px]">
                    {row.project_name}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-500">{row.total_tasks}</td>
                  <td className="py-2 text-right font-mono text-slate-500">{row.unplanned_tasks}</td>
                  <td className="py-2 text-right">
                    <span className={`font-mono font-semibold ${
                      row.scope_creep_index > 30 ? 'text-rose-600'
                        : row.scope_creep_index > 15 ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {row.scope_creep_index}%
                    </span>
                  </td>
                </tr>
              ))}
              {scopeCreep.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Designer Utilisation
          </p>
          <div className="space-y-4">
            {utilization.map(d => {
              const pct = d.utilization_pct ?? 0;
              return (
                <div key={d.designer_id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700 font-medium">{d.designer_name}</span>
                    <span className={`font-mono font-semibold ${
                      pct > 100 ? 'text-rose-600' : pct > 80 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {d.utilization_pct !== null ? `${pct.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: utilBarColor(pct) }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {d.logged_hours.toFixed(1)}h / {d.available_hours_per_week ?? '?'}h per week
                  </p>
                </div>
              );
            })}
            {utilization.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No designers found</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Client Profitability ranking ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Client Profitability Ranking
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-2 text-left  text-xs font-semibold text-slate-400 w-8">#</th>
              <th className="pb-2 text-left  text-xs font-semibold text-slate-400">Client</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">Revenue</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">Hours</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">EHR</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">Revisions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {profitability.map((row, i) => (
              <tr key={row.client_id}>
                <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{i + 1}</td>
                <td className="py-2.5 pr-4 text-slate-700 font-medium">{row.client_name}</td>
                <td className="py-2.5 text-right font-mono text-slate-900">{row.total_revenue.toLocaleString()}</td>
                <td className="py-2.5 text-right font-mono text-slate-500">{row.total_hours.toFixed(1)}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-blue-700">
                  {row.ehr !== null ? row.ehr.toFixed(2) : '—'}
                </td>
                <td className="py-2.5 text-right">
                  <span className={`font-mono ${row.revision_count > 5 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                    {row.revision_count}
                  </span>
                </td>
              </tr>
            ))}
            {profitability.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs text-slate-400">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Profit Margin per project ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Profit Margin per Project
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-2 text-left  text-xs font-semibold text-slate-400">Project</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">EHR</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">Avg Designer Rate</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-400">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {profitMargin.map(row => (
              <tr key={row.project_id}>
                <td className="py-2.5 pr-4 text-slate-700 font-medium">{row.project_name}</td>
                <td className="py-2.5 text-right font-mono text-slate-900">{row.ehr.toFixed(2)}</td>
                <td className="py-2.5 text-right font-mono text-slate-500">
                  {row.avg_designer_rate !== null ? row.avg_designer_rate.toFixed(2) : '—'}
                </td>
                <td className="py-2.5 text-right">
                  {row.profit_margin_pct !== null ? (
                    <span className={`font-mono font-semibold ${
                      row.profit_margin_pct < 0 ? 'text-rose-600'
                        : row.profit_margin_pct < 20 ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {row.profit_margin_pct.toFixed(1)}%
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
            {profitMargin.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs text-slate-400">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </AppShell>
  );
}