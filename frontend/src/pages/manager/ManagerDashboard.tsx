import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useKPISummary } from '../../hooks/useAnalytics';
import AppShell from '../../components/AppShell';

export default function ManagerDashboard() {
  const { user }  = useAuth();
  const { data: kpi } = useKPISummary();

  const KPI_CARDS = [
    { label: 'Active Projects',  value: kpi ? String(kpi.active_projects)       : '—', rail: 'bg-blue-500' },
    { label: 'Total Revenue',    value: kpi ? kpi.total_revenue.toLocaleString() : '—', rail: 'bg-emerald-500' },
    { label: 'Avg. EHR',         value: kpi ? kpi.avg_ehr.toFixed(2)             : '—', rail: 'bg-yellow-500' },
    { label: 'Pending Feedback', value: kpi ? String(kpi.pending_feedback)        : '—', rail: 'bg-rose-500' },
  ];

  return (
    <AppShell title="Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-slate-900">
          Welcome back, {user?.full_name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Here's an overview of your agency today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-5 pr-5 py-5"
          >
            <div className={`absolute left-0 inset-y-0 w-1 ${card.rail}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {card.label}
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/manager/projects"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" className="text-blue-700">
              <path d="M1.5 3.5a1 1 0 011-1H6l1.5 2H13a1 1 0 011 1v7a1 1 0 01-1 1H2.5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Projects</p>
          <p className="text-sm text-slate-500 mt-1">View and manage all client projects</p>
        </Link>

        <Link
          to="/manager/analytics"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" className="text-blue-700">
              <path d="M1.5 11.5l3.5-4.5 3 2 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Analytics</p>
          <p className="text-sm text-slate-500 mt-1">BI dashboards — EHR, budget variance, client profitability</p>
        </Link>

        <Link
          to="/manager/reports"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" className="text-blue-700">
              <rect x="2.5" y="1" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 5h4M5.5 7.5h4M5.5 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Reports</p>
          <p className="text-sm text-slate-500 mt-1">Export PDF and Excel profitability reports</p>
        </Link>
      </div>
    </AppShell>
  );
}