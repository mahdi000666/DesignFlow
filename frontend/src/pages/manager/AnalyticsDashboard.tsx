import { useState, useMemo } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  BarChart, Bar, LabelList, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Activity, Clock } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import {
  useKPISummary,
  useScopeCreep,
  useCumulativeHours,
  useRevenueByClient,
  useProfitMargin,
} from '../../hooks/useAnalytics';
import { useProjects } from '../../hooks/useProjects';
import { exportPDF, exportExcel } from '../../api/analytics';
import type { AnalyticsFilters } from '../../types/analytic';
import { formatTND, formatEHR } from '../../utils/format';

// ─── Colour helpers ────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const scopeColor = (idx: number) =>
  idx > 30 ? '#ef4444' : idx > 15 ? '#f59e0b' : '#6366f1';

// < 0% → red (loss), 0–15% → amber (thin), 15–40% → indigo (healthy), ≥ 40% → emerald (excellent)
const marginColor = (pct: number | null): string => {
  if (pct === null) return '#94a3b8';
  if (pct < 0)  return '#ef4444';
  if (pct < 15) return '#f59e0b';
  if (pct < 40) return '#6366f1';
  return '#10b981';
};

type ChartFormatterValue = number | string | Array<number | string> | undefined;
const getChartValue = (v: ChartFormatterValue) => Array.isArray(v) ? v[0] : v;
const hBarHeight = (n: number) => Math.max(200, n * 44 + 28);

// ─── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({ title, sub, aside }: {
  title: string;
  sub?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="section-title">{title}</p>
        {sub && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {sub}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
}

function Empty({ h = 160, message = 'No data' }: { h?: number; message?: string }) {
  return (
    <div className="flex items-center justify-center text-sm text-slate-400" style={{ height: h }}>
      {message}
    </div>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, projects, clients }: {
  filters:  AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
  projects: { id: number; project_name: string }[];
  clients:  { id: number; name: string }[];
}) {
  const sel = 'px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer transition-colors hover:bg-slate-50';
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

// ─── Export button ─────────────────────────────────────────────────────────────

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
        ${disabled
          ? 'border-slate-200 text-slate-400 bg-white'
          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
        }`}
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <path d="M3.5 1.5h5l3 3v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M8.5 1.5v3h3M5 9.5h5M5 7h5M5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      {loading ? 'Generating…' : label}
    </button>
  );
}

// ─── Margin colour legend ──────────────────────────────────────────────────────

function MarginLegend() {
  return (
    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Margin scale</span>
      {[
        { color: '#10b981', label: '≥ 40% excellent' },
        { color: '#6366f1', label: '15–40% healthy'  },
        { color: '#f59e0b', label: '0–15% thin'       },
        { color: '#ef4444', label: '< 0% loss'        },
      ].map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'error';

export default function AnalyticsDashboard() {
  const [filters, setFilters]     = useState<AnalyticsFilters>({});
  const [pdfState,  setPdfState]  = useState<ExportState>('idle');
  const [xlsState,  setXlsState]  = useState<ExportState>('idle');
  const [exportErr, setExportErr] = useState('');

  const { data: projects = [] }     = useProjects();
  const { data: kpi }               = useKPISummary(filters);
  const { data: revenueData = [] }  = useRevenueByClient(filters);
  const { data: scopeCreep = [] }   = useScopeCreep(filters);
  const { data: profitMargin = [] } = useProfitMargin(filters);
  const { data: cumulativeHours, isLoading: loadingCumulative } = useCumulativeHours(filters);

  const hasProject = !!filters.project;

  // ── Client list for filter bar ───────────────────────────────────────────────
  const clients = useMemo(
    () =>
      Array.from(new Map(projects.map(p => [p.client, p.client_name])).entries()).map(
        ([id, name]) => ({ id, name }),
      ),
    [projects],
  );

  // ── Profit margin derivations ────────────────────────────────────────────────
  const validMargins = useMemo(
    () => profitMargin.filter(r => r.profit_margin_pct !== null),
    [profitMargin],
  );
  const sortedMargins = useMemo(
    () => [...validMargins].sort((a, b) => (b.profit_margin_pct ?? 0) - (a.profit_margin_pct ?? 0)),
    [validMargins],
  );
    const avgMargin = useMemo(() => {
    if (!validMargins.length) return null;
    const totalRevenue = validMargins.reduce((s, r) => s + (r.budget_amount || 0), 0);
    if (totalRevenue <= 0) {
      // Fallback if budget data is missing
      return validMargins.reduce((s, r) => s + r.profit_margin_pct!, 0) / validMargins.length;
    }
    return (
      validMargins.reduce((s, r) => s + (r.profit_margin_pct ?? 0) * (r.budget_amount || 0), 0) /
      totalRevenue
    );
  }, [validMargins]);

  // Fixed ±100% scale — bar widths read as absolute percentages, not relative to peer max.
  const MARGIN_EXTENT = 100;

  // ── Client-level margin ──────────────────────────────────────────────────────
  // Derived by joining project margins with the projects list — no new backend endpoint needed.
  // Uses a simple average across each client's projects.
  // Projects excluded from validMargins (no designer rate) are also excluded here.
  const totalHours = useMemo(
    () => profitMargin.reduce((s, r) => s + r.actual_hours, 0),
    [profitMargin],
  );

    const clientMargins = useMemo(() => {
    const projectClientMap = new Map(
      projects.map(p => [
        p.id,
        { name: p.client_name, clientId: p.client, budget: Number(p.budget_amount || 0) },
      ]),
    );
    const clientMap = new Map<number, { name: string; margins: number[]; budgets: number[] }>();

    for (const pm of validMargins) {
      const info = projectClientMap.get(pm.project_id);
      if (!info) continue;
      const existing = clientMap.get(info.clientId) ?? { name: info.name, margins: [], budgets: [] };
      existing.margins.push(pm.profit_margin_pct!);
      existing.budgets.push(info.budget);
      clientMap.set(info.clientId, existing);
    }

    return Array.from(clientMap.values())
      .map(({ name, margins, budgets }) => {
        const totalBudget = budgets.reduce((s, v) => s + v, 0);
        const weightedMargin =
          totalBudget > 0
            ? margins.reduce((sum, m, i) => sum + m * budgets[i], 0) / totalBudget
            : margins.reduce((s, v) => s + v, 0) / margins.length; // fallback

        return {
          client_name:   name,
          avg_margin:    Math.round(weightedMargin * 10) / 10,
          project_count: margins.length,
        };
      })
      .sort((a, b) => b.avg_margin - a.avg_margin);
  }, [validMargins, projects]);

  // ── KPI cards ────────────────────────────────────────────────────────────────
  // Active Projects and Pending Feedback also appear on the Dashboard KPI row —
  // they're repeated here because they respond to the date/client filters above,
  // giving the analytics charts headline context when filters are applied.
  const KPI_CARDS = [
    {
      label: 'Total Revenue',
      value: kpi ? formatTND(kpi.total_revenue) : '—',
      icon: <DollarSign size={15} />,
      borderColor: '#6366f1',
    },
    {
      label: 'Avg. EHR',
      value: kpi ? formatEHR(kpi.avg_ehr) : '—',
      icon: <Activity size={15} />,
      borderColor: '#3b82f6',
    },
    {
      label: 'Avg. Profit Margin',
      value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—',
      icon: <TrendingUp size={15} />,
      // Border colour responds to margin health so the card itself is a signal
      borderColor: avgMargin !== null ? marginColor(avgMargin) : '#94a3b8',
    },
    {
      label: 'Total Hours Logged',
      value: totalHours > 0 ? `${totalHours.toFixed(1)}h` : '—',
      icon: <Clock size={15} />,
      borderColor: '#f59e0b',
    },
  ];

  // ── Export ───────────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────

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

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} borderColor={c.borderColor} />
        ))}
      </div>

      {/* ── Row 2: Cumulative Hours + Revenue by Client ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Cumulative Hours — only meaningful per-project */}
        <div className="card p-5">
          <SectionHeader
            title="Cumulative Hours Over Time"
            sub="Select a project from the filters above"
          />
          {hasProject ? (
            loadingCumulative ? (
              <Empty message="Loading…" />
            ) : cumulativeHours && cumulativeHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={195}>
                <LineChart data={cumulativeHours} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: ChartFormatterValue) => [
                      `${getChartValue(value) ?? 0}h`, 'Cumulative',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_hours"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty message="No time logs yet for this project." />
            )
          ) : (
            <Empty h={195} message="Choose a project to see the time trend" />
          )}
        </div>

        {/* Revenue by Client — answers "who are our biggest clients by contract value" */}
        <div className="card p-5">
          <SectionHeader
            title="Revenue by Client"
            sub="Contract value — not adjusted for hours worked"
          />
          {revenueData.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex items-center gap-4 pt-1">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    dataKey="total_revenue"
                    nameKey="client_name"
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={70}
                    strokeWidth={2} stroke="#fff"
                  >
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: ChartFormatterValue) =>
                      formatTND(Number(getChartValue(value) ?? 0))
                    }
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

      {/* ── Row 3: Client Profit Margin + Scope Creep ────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Client Profit Margin */}
        {/* Answers: which client relationships are most profitable to grow? */}
        <div className="card p-5">
          <SectionHeader
            title="Client Profit Margin"
            sub="Avg. across their projects"
          />
          {clientMargins.length === 0 ? (
            <Empty
              h={hBarHeight(3)}
              message={
                validMargins.length === 0
                  ? 'No data — ensure designer hourly rates are configured'
                  : 'Could not map project margins to clients'
              }
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={hBarHeight(clientMargins.length)}>
                <BarChart
                  data={clientMargins}
                  layout="vertical"
                  margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    height={15}
                  />
                  <YAxis
                    type="category"
                    dataKey="client_name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v}
                  />
                  {/* Zero line — bars left of here represent loss-making clients */}
                  <ReferenceLine x={0} stroke="#e2e8f0" strokeWidth={1} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(value: ChartFormatterValue) => [
                      `${Number(getChartValue(value) ?? 0).toFixed(1)}%`,
                      'Avg. Margin',
                    ]}
                    labelFormatter={(label: unknown) => {
                      const name = String(label ?? '');
                      const row  = clientMargins.find(r => r.client_name === name);
                      return row
                        ? `${name}  ·  ${row.project_count} project${row.project_count !== 1 ? 's' : ''}`
                        : name;
                    }}
                  />
                  <Bar dataKey="avg_margin" radius={[0, 2, 2, 0]} barSize={14}>
                    {clientMargins.map((row, i) => (
                      <Cell key={i} fill={marginColor(row.avg_margin)} />
                    ))}
                    <LabelList
                      dataKey="avg_margin"
                      position="right"
                      formatter={(v: unknown) => `${Number(v ?? 0).toFixed(1)}%`}
                      style={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <MarginLegend />
            </>
          )}
        </div>

        {/* Scope Creep Index */}
        <div className="card p-5 flex flex-col" style={{ minHeight: `${hBarHeight(6)}px` }}>
          <SectionHeader
            title="Scope Creep Index"
            sub="Unplanned tasks as % of total · hover for breakdown"
          />
          {(() => {
            const filtered = scopeCreep.filter(r => r.scope_creep_index > 0);
            if (filtered.length === 0) {
              return (
                <Empty
                  h={hBarHeight(3)}
                  message={scopeCreep.length > 0 ? 'No scope creep detected' : 'No data'}
                />
              );
            }
            const sorted = [...filtered].sort((a, b) => b.scope_creep_index - a.scope_creep_index);
            return (
              <div className="flex-1 relative" style={{ minHeight: hBarHeight(sorted.length) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sorted}
                  layout="vertical"
                  margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    //height={50}
                  />
                  <YAxis
                    type="category"
                    dataKey="project_name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    //width={90}
                    tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(value: ChartFormatterValue) => [
                      `${getChartValue(value) ?? 0}%`, 'Scope Creep',
                    ]}
                    labelFormatter={(label: unknown) => {
                      const name = String(label ?? '');
                      const row  = sorted.find(r => r.project_name === name);
                      return row
                        ? `${name}  ·  ${row.unplanned_tasks} unplanned / ${row.total_tasks} total`
                        : name;
                    }}
                  />
                  <Bar
                    dataKey="scope_creep_index"
                    radius={[0, 2, 2, 0]}
                    barSize={14}
                    animationDuration={800}
                  >
                    {sorted.map((row, i) => (
                      <Cell key={i} fill={scopeColor(row.scope_creep_index)} />
                    ))}
                    <LabelList
                      dataKey="scope_creep_index"
                      position="right"
                      formatter={(v: unknown) => `${Number(v ?? 0).toFixed(1)}%`}
                      style={{ fontSize: 10, fill: '#64748b' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Row 4: Profit Margin per Project (full width — most important chart) ── */}
      {/* This is the only chart that answers "are individual projects making money?" */}
      <div className="card p-5 mb-4">
        <SectionHeader
          title="Profit Margin per Project"
          aside={
            profitMargin.length > 0 && validMargins.length < profitMargin.length ? (
              <span className="text-[10px] text-slate-400 shrink-0">
                {profitMargin.length - validMargins.length} project(s) excluded — no designer rate set
              </span>
            ) : undefined
          }
        />
        {validMargins.length === 0 ? (
          <Empty h={128} message="No data — ensure designer hourly rates are configured" />
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(260px,2fr)_76px_124px] gap-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Project</span>
                <span className="text-center">Margin Spread (±100%)</span>
                <span className="text-right">Margin</span>
                <span className="text-right">EHR / Designer Rate</span>
              </div>

              {sortedMargins.map((row) => {
                const pct      = row.profit_margin_pct ?? 0;
                const widthPct = `${(Math.abs(pct) / MARGIN_EXTENT) * 50}%`;
                const color    = marginColor(row.profit_margin_pct);

                return (
                  <div
                    key={row.project_id}
                    className="grid grid-cols-[minmax(0,1.35fr)_minmax(260px,2fr)_76px_124px] items-center gap-4 rounded-lg border border-slate-100 px-2 py-2.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{row.project_name}</p>
                    </div>
                    {/* Centre-anchored spread bar — right of centre = profit, left = loss */}
                    <div className="relative h-10 rounded-lg bg-slate-50">
                      <div className="absolute inset-y-2 left-0 right-0 rounded-full bg-slate-100" />
                      <div className="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-slate-300" />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-300">−</div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-300">+</div>
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full transition-all"
                        style={{
                          width: widthPct,
                          left: pct >= 0 ? '50%' : `calc(50% - ${widthPct})`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold" style={{ color }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[11px] font-semibold text-slate-700">
                        {formatEHR(row.ehr)}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {row.avg_designer_rate !== null ? formatEHR(row.avg_designer_rate) : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <MarginLegend />
          </>
        )}
      </div>
    </AppShell>
  );
}