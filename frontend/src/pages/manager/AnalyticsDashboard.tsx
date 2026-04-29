import { useState, useMemo } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Activity, Clock, TrendingUp } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import {
  useKPISummary,
  useClientProfitability,
  useScopeCreep,
  useCumulativeHours,
  useRevenueByClient,
  useProfitMargin,
} from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { exportPDF, exportExcel } from '../../api/analytics';
import type { AnalyticsFilters } from '../../types/analytic';
import { formatTND, formatEHR } from '../../utils/format';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#1e40af', '#6366f1', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const scopeColor  = (idx: number)          => idx > 30 ? '#ef4444' : idx > 15 ? '#f59e0b' : '#6366f1';
const marginColor = (pct: number | null) => pct === null ? '#94a3b8' : pct < 0 ? '#ef4444' : pct < 20 ? '#f59e0b' : '#6366f1';
type ChartFormatterValue = number | string | Array<number | string> | undefined;

const getChartValue = (value: ChartFormatterValue) => Array.isArray(value) ? value[0] : value;
const metricCountColor = (count: number) => count > 0 ? 'text-rose-600' : 'text-slate-400';

const hBarHeight = (n: number) => Math.max(220, n * 44 + 28);

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, projects, clients }: {
  filters:  AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
  projects: { id: number; project_name: string }[];
  clients:  { id: number; name: string }[];
}) {
  const sel = 'px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer transition-colors hover:bg-slate-50';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap items-end gap-3">
      {(['date_from', 'date_to'] as const).map(key => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {key === 'date_from' ? 'From' : 'To'}
          </label>
          <input
            type="date"
            value={filters[key] ?? ''}
            onChange={e => onChange({ ...filters, [key]: e.target.value || undefined })}
            className={sel}
          />
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</label>
        <select
          value={filters.project ?? ''}
          onChange={e => onChange({ ...filters, project: e.target.value ? Number(e.target.value) : undefined })}
          className={sel}
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Client</label>
        <select
          value={filters.client ?? ''}
          onChange={e => onChange({ ...filters, client: e.target.value ? Number(e.target.value) : undefined })}
          className={sel}
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

// ─── Export button ────────────────────────────────────────────────────────────

function ExportBtn({ label, loading, disabled, title, onClick }: {
  label: string; loading: boolean; disabled?: boolean; title?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      title={title}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed border
        ${disabled ? 'border-slate-200 text-slate-400 bg-white' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <path d="M3.5 1.5h5l3 3v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M8.5 1.5v3h3M5 9.5h5M5 7h5M5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      {loading ? 'Generating…' : label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'error';

export default function AnalyticsDashboard() {
  const [filters, setFilters]     = useState<AnalyticsFilters>({});
  const [pdfState,  setPdfState]  = useState<ExportState>('idle');
  const [xlsState,  setXlsState]  = useState<ExportState>('idle');
  const [exportErr, setExportErr] = useState('');

  const { data: projects = [] }      = useProjects();
  const { data: kpi }                = useKPISummary(filters);
  const { data: revenueData = [] }   = useRevenueByClient(filters);
  const { data: profitability = [] } = useClientProfitability(filters);
  const { data: scopeCreep = [] }    = useScopeCreep(filters);
  const { data: profitMargin = [] }  = useProfitMargin(filters);
  const { data: cumulativeHours, isLoading: loadingCumulative } = useCumulativeHours(filters);

  const clients = useMemo(
    () => Array.from(new Map(projects.map(p => [p.client, p.client_name])).entries())
      .map(([id, name]) => ({ id, name })),
    [projects],
  );

  const hasProject = !!filters.project;

  // Total hours — sum across profitability rows
  const totalHours = profitability.reduce((s, r) => s + r.total_hours, 0);

  // Average profit margin — plain derivation, no useMemo needed
  const validMargins = profitMargin.filter(r => r.profit_margin_pct !== null);
  const avgMargin = validMargins.length
    ? validMargins.reduce((s, r) => s + r.profit_margin_pct!, 0) / validMargins.length
    : null;
  const profitMarginExtent = validMargins.length
    ? Math.max(...validMargins.map((row) => Math.abs(row.profit_margin_pct!)), 10)
    : 10;
  const sortedMargins = [...validMargins].sort((a, b) => (b.profit_margin_pct ?? 0) - (a.profit_margin_pct ?? 0));

  // Fix #3: KPI cards with icons matching the screenshot
  const KPI_CARDS = [
    {
      label: 'Total Revenue',
      value: kpi ? formatTND(kpi.total_revenue) : '—',
      icon: <DollarSign size={15} />,
    },
    {
      label: 'Avg. EHR',
      value: kpi ? formatEHR(kpi.avg_ehr) : '—',
      icon: <Activity size={15} />,
    },
    {
      label: 'Total Hours',
      value: `${totalHours.toFixed(1)}h`,
      icon: <Clock size={15} />,
    },
    {
      label: 'Profit Margin',
      value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—',
      icon: <TrendingUp size={15} />,
    },
  ];

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (fmt: 'pdf' | 'excel') => {
    const set = fmt === 'pdf' ? setPdfState : setXlsState;
    set('loading');
    setExportErr('');
    try {
      if (fmt === 'pdf') {
        if (!filters.project) {
          setExportErr('Select a project in the filter bar to export a PDF report.');
          set('error'); return;
        }
        await exportPDF(filters.project);
      } else {
        await exportExcel(filters.project);
      }
      set('idle');
    } catch {
      set('error');
      setExportErr('Export failed. Please try again.');
    }
  };

  return (
    <AppShell
      title="Analytics"
      actions={
        <div className="flex items-center gap-2">
          <ExportBtn
            label="PDF" loading={pdfState === 'loading'}
            disabled={!hasProject}
            title={!hasProject ? 'Select a project to export PDF' : 'Export PDF report'}
            onClick={() => handleExport('pdf')}
          />
          <ExportBtn
            label="Excel" loading={xlsState === 'loading'}
            onClick={() => handleExport('excel')}
          />
        </div>
      }
    >
      {exportErr && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm mb-5">
          {exportErr}
        </div>
      )}

      <FilterBar filters={filters} onChange={setFilters} projects={projects} clients={clients} />

      {/* ── Row 1: KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} />
        ))}
      </div>

      {/* ── Row 2: Cumulative Hours + Revenue by Client ───────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Cumulative Hours Over Time */}
        <div className="card p-5">
          <p className="section-title mb-1">Cumulative Hours Over Time</p>
          {!hasProject && (
            <p className="text-xs text-slate-400 mb-2">Select a project from the filters above</p>
          )}
          {hasProject ? (
            loadingCumulative ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">Loading…</div>
            ) : cumulativeHours && cumulativeHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={195}>
                <LineChart data={cumulativeHours} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
                  {/* Fix #2: Tooltip formatter with proper type handling */}
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: ChartFormatterValue) => {
                      const v = getChartValue(value);
                      return [`${v ?? 0}h`, 'Cumulative'];
                    }}
                  />
                  <Line type="monotone" dataKey="cumulative_hours" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                No time logs yet for this project.
              </div>
            )
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-300">
              Choose a project to see the time trend
            </div>
          )}
        </div>

        {/* Revenue by Client — donut + legend */}
        <div className="card p-5">
          <p className="section-title mb-2">Revenue by Client</p>
          {revenueData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <div className="flex items-center gap-4 pt-2">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    dataKey="total_revenue" nameKey="client_name"
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={70}
                    strokeWidth={2} stroke="#fff"
                  >
                    {revenueData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  {/* Fix #2: Tooltip formatter with proper type handling */}
                  <Tooltip
                    formatter={(value: ChartFormatterValue) => {
                      const v = getChartValue(value);
                      return formatTND(Number(v ?? 0));
                    }}
                    contentStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5 min-w-0">
                {revenueData.map((r, i) => (
                  <div key={r.client_name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-600 truncate">{r.client_name}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-800 shrink-0">
                      {formatTND(r.total_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Client Profitability + Scope Creep ─────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Client Profitability Ranking */}
        <div className="card p-5">
          <p className="section-title mb-4">Client Profitability Ranking</p>
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 pr-3 text-left text-xs font-semibold text-slate-400">#</th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-slate-400">Client</th>
                <th className="pb-2 text-right text-xs font-semibold text-slate-400">Revenue</th>
                <th className="pb-2 text-right text-xs font-semibold text-slate-400">Hours</th>
                <th className="pb-2 text-right text-xs font-semibold text-slate-400">EHR</th>
                <th className="pb-2 text-right text-xs font-semibold text-slate-400">Rev.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profitability.map((row, i) => (
                <tr key={row.client_id}>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{i + 1}</td>
                  <td className="py-2.5 pr-4 text-slate-700 font-medium truncate max-w-[110px]">{row.client_name}</td>
                  <td className="py-2.5 text-right font-mono text-slate-900 text-xs">{formatTND(row.total_revenue)}</td>
                  <td className="py-2.5 text-right font-mono text-slate-500 text-xs">{row.total_hours.toFixed(1)}</td>
                  {/* Fix #5: Apply formatEHR */}
                  <td className="py-2.5 text-right font-mono font-semibold text-primary text-xs">
                    {row.ehr !== null ? formatEHR(row.ehr) : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`font-mono text-xs ${row.revision_count > 5 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                      {row.revision_count}
                    </span>
                  </td>
                </tr>
              ))}
              {profitability.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-xs text-slate-400">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Scope Creep Index — progress bars */}
        <div className="card p-5">
          <p className="section-title mb-4">Scope Creep Index</p>
          {scopeCreep.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">No data</div>
          ) : (
            <div className="space-y-4">
              {scopeCreep.map(row => {
                const idx = row.scope_creep_index;
                const color = scopeColor(idx);
                return (
                  <div key={row.project_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-700 font-medium truncate max-w-[200px]">
                        {row.project_name}
                      </span>
                      <span className="font-mono text-xs font-semibold" style={{ color }}>
                        {idx}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${Math.min(idx, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      <span className={`font-semibold ${metricCountColor(row.unplanned_tasks)}`}>
                        {row.unplanned_tasks}
                      </span>{' '}
                      <span className="text-slate-500">Unplanned</span>
                      <span className="text-slate-300"> / </span>
                      <span className="font-semibold text-slate-700">{row.total_tasks}</span>{' '}
                      <span className="text-slate-500">Total</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Profit Margin per Project ──────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="section-title">Profit Margin per Project</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Profit margin vs hourly cost
            </p>
          </div>
          {profitMargin.length > 0 && validMargins.length < profitMargin.length && (
            <span className="text-[10px] text-slate-400">
              {profitMargin.length - validMargins.length} project(s) excluded — no designer rate set
            </span>
          )}
        </div>
        {validMargins.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            No data - ensure designer hourly rates are configured
          </div>
        ) : (
          <div className="space-y-3" style={{ minHeight: `${hBarHeight(sortedMargins.length)}px` }}>
            <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(260px,2fr)_76px_124px] gap-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Project</span>
              <span className="text-center">Margin Spread</span>
              <span className="text-right">Margin</span>
              <span className="text-right">EHR / Rate</span>
            </div>
            {sortedMargins.map((row) => {
              const pct = row.profit_margin_pct ?? 0;
              const widthPct = `${(Math.abs(pct) / profitMarginExtent) * 50}%`;
              const ehrText = formatEHR(row.ehr);
              const rateText = row.avg_designer_rate !== null ? formatEHR(row.avg_designer_rate) : '-';

              return (
                <div
                  key={row.project_id}
                  className="grid grid-cols-[minmax(0,1.35fr)_minmax(260px,2fr)_76px_124px] items-center gap-4 rounded-lg border border-slate-100 px-2 py-2.5 hover:bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{row.project_name}</p>
                  </div>
                  <div className="relative h-10 rounded-lg bg-slate-50">
                    <div className="absolute inset-y-2 left-0 right-0 rounded-full bg-slate-100" />
                    <div className="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-slate-300" />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-300">-</div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-300">+</div>
                    <div
                      className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                      style={{
                        width: widthPct,
                        left: pct >= 0 ? '50%' : `calc(50% - ${widthPct})`,
                        backgroundColor: marginColor(row.profit_margin_pct),
                      }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold" style={{ color: marginColor(row.profit_margin_pct) }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] font-semibold text-slate-700">{ehrText}</p>
                    <p className="font-mono text-[10px] text-slate-400">{rateText}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </AppShell>
  );
}
