import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import AppShell from '../../components/AppShell';
import {
  useBudgetVariance,
  useRevenueByClient,
  useClientProfitability,
  useScopeCreep,
  useDesignerUtilization,
  useCumulativeHours,
  useProfitMargin,
} from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { exportPDF, exportExcel } from '../../api/analytics';
import type { AnalyticsFilters, ScopeCreepItem, ProfitMarginItem } from '../../types/analytic';
import { formatTND } from '../../utils/format';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const utilBarColor = (pct: number) =>
  pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';

const scopeColor = (idx: number) =>
  idx > 30 ? '#ef4444' : idx > 15 ? '#f59e0b' : '#10b981';

const marginColor = (pct: number | null) => {
  if (pct === null) return '#94a3b8';
  return pct < 0 ? '#ef4444' : pct < 20 ? '#f59e0b' : '#10b981';
};

// Responsive height for horizontal bar charts — scales with row count.
const hBarHeight = (count: number) => Math.max(180, count * 42 + 40);

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------

interface ScopeTooltipProps {
  active?: boolean;
  payload?: { payload: ScopeCreepItem }[];  // for ScopeTooltip
}

interface MarginTooltipProps {
  active?: boolean;
  payload?: { payload: ProfitMarginItem }[];
}

function ScopeTooltip({ active, payload }: ScopeTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs shadow-sm">
      <p className="font-semibold text-slate-800 mb-1.5 max-w-[180px] truncate">{row.project_name}</p>
      <p className="text-slate-500">Total tasks: <span className="font-mono">{row.total_tasks}</span></p>
      <p className="text-slate-500">Unplanned: <span className="font-mono">{row.unplanned_tasks}</span></p>
      <p className="text-slate-500">
        Index:{' '}
        <span className={`font-mono font-semibold ${
          row.scope_creep_index > 30 ? 'text-rose-600' : row.scope_creep_index > 15 ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {row.scope_creep_index}%
        </span>
      </p>
    </div>
  );
}

function MarginTooltip({ active, payload }: MarginTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const pct = row.profit_margin_pct;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs shadow-sm">
      <p className="font-semibold text-slate-800 mb-1.5 max-w-[180px] truncate">{row.project_name}</p>
      <p className="text-slate-500">EHR: <span className="font-mono">{row.ehr.toFixed(2)}</span></p>
      <p className="text-slate-500">
        Avg Designer Rate:{' '}
        <span className="font-mono">{row.avg_designer_rate !== null ? row.avg_designer_rate.toFixed(2) : '—'}</span>
      </p>
      <p className="text-slate-500">
        Margin:{' '}
        <span className={`font-mono font-semibold ${
          pct === null ? 'text-slate-400' : pct < 0 ? 'text-rose-600' : pct < 20 ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters:  AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
  projects: { id: number; project_name: string }[];
  clients:  { id: number; name: string }[];
}

function FilterBar({ filters, onChange, projects, clients }: FilterBarProps) {
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
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Client</label>
        <select
          value={filters.client ?? ''}
          onChange={e => onChange({ ...filters, client: e.target.value ? Number(e.target.value) : undefined })}
          className={selectCls}
        >
          <option value="">All clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
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

type ExportState = 'idle' | 'loading' | 'error';

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [pdfState,    setPdfState]    = useState<ExportState>('idle');
  const [excelState,  setExcelState]  = useState<ExportState>('idle');
  const [exportError, setExportError] = useState('');

  const { data: projects = [] } = useProjects();
  const clients = useMemo(
    () => Array.from(new Map(projects.map(p => [p.client, p.client_name])).entries())
      .map(([id, name]) => ({ id, name })),
    [projects],
  );

  const { data: budgetData = [] }    = useBudgetVariance(filters);
  const { data: revenueData = [] }   = useRevenueByClient(filters);
  const { data: profitability = [] } = useClientProfitability(filters);
  const { data: scopeCreep = [] }    = useScopeCreep(filters);
  const { data: utilization = [] }   = useDesignerUtilization(filters);
  const { data: cumulativeHours, isLoading: loadingCumulative } = useCumulativeHours(filters);
  const { data: profitMargin = [] }  = useProfitMargin(filters);

  const hasProjectFilter = !!filters.project;

  // Profit margin rows with null margins excluded from chart (no rate data)
  const marginChartData = profitMargin.filter(r => r.profit_margin_pct !== null);

  const handleExport = async (format: 'pdf' | 'excel') => {
    const setter = format === 'pdf' ? setPdfState : setExcelState;
    setter('loading');
    setExportError('');
    try {
      if (format === 'pdf') {
        if (!filters.project) {
          setExportError('Select a project in the filter bar to export a PDF report.');
          setPdfState('error');
          return;
        }
        await exportPDF(filters.project);
      } else {
        await exportExcel(filters.project);
      }
      setter('idle');
    } catch {
      setter('error');
      setExportError('Export failed. Please try again.');
    }
  };

  return (
    <AppShell
      title="Analytics"
      breadcrumb="Analytics"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={pdfState === 'loading'}
            title={!hasProjectFilter ? 'Select a project to export PDF' : 'Export PDF report'}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
              !hasProjectFilter
                ? 'border-slate-200 text-slate-400 bg-white cursor-not-allowed'
                : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M3.5 1.5h5l3 3v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8.5 1.5v3h3M5 9.5h5M5 7h5M5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {pdfState === 'loading' ? 'Generating…' : 'PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={excelState === 'loading'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M3.5 1.5h5l3 3v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 7l2 2.5L9 7M7 9.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {excelState === 'loading' ? 'Generating…' : 'Excel'}
          </button>
        </div>
      }
    >

      {/* Export error banner */}
      {exportError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm mb-5">
          {exportError}
        </div>
      )}

      <FilterBar filters={filters} onChange={setFilters} projects={projects} clients={clients} />

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
                  formatter={(v: number | undefined) => v ? formatTND(v) : '—'}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Cumulative hours line chart ──────────────────────────────────── */}
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

      {/* ── Row 2: Scope Creep (chart) + Designer Utilisation (bars) ────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Scope Creep — horizontal bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Scope Creep Index
          </p>
          {scopeCreep.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={hBarHeight(scopeCreep.length)}>
              <BarChart
                layout="vertical"
                data={scopeCreep}
                margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="project_name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={120}
                  tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 18)}…` : v}
                />
                <Tooltip content={<ScopeTooltip />} />
                <Bar dataKey="scope_creep_index" name="Scope Creep %" radius={[0, 3, 3, 0]}>
                  {scopeCreep.map((row, i) => (
                    <Cell key={i} fill={scopeColor(row.scope_creep_index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Designer Utilisation — progress bars (already visual, compact) */}
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
                      style={{
                        width:           `${Math.min(pct, 100)}%`,
                        backgroundColor: utilBarColor(pct),
                      }}
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

      {/* ── Client Profitability — table (multi-column, better as table) ── */}
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
                <td className="py-2.5 text-right font-mono text-slate-900">{formatTND(row.total_revenue)}</td>
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

      {/* ── Profit Margin — horizontal bar chart ────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Profit Margin per Project
          </p>
          {profitMargin.length > 0 && marginChartData.length < profitMargin.length && (
            <span className="text-[10px] text-slate-400">
              {profitMargin.length - marginChartData.length} project(s) excluded — no designer rate set
            </span>
          )}
        </div>

        {marginChartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-slate-400">
            No data — ensure designer hourly rates are configured
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={hBarHeight(marginChartData.length)}>
            <BarChart
              layout="vertical"
              data={marginChartData}
              margin={{ top: 4, right: 50, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="project_name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                width={120}
                tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 18)}…` : v}
              />
              <Tooltip content={<MarginTooltip />} />
              {/* Reference line at 0 for negative margin visibility */}
              <Bar dataKey="profit_margin_pct" name="Profit Margin %" radius={[0, 3, 3, 0]}>
                {marginChartData.map((row, i) => (
                  <Cell key={i} fill={marginColor(row.profit_margin_pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </AppShell>
  );
}