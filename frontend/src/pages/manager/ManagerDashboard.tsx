import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../components/AppShell';

const KPI_PLACEHOLDERS = [
  { label: 'Active Projects',  value: '—', rail: 'bg-blue-500',    sub: 'Available in Sprint 5' },
  { label: 'Total Revenue',    value: '—', rail: 'bg-emerald-500', sub: 'Available in Sprint 5' },
  { label: 'Avg. EHR',         value: '—', rail: 'bg-amber-500',   sub: 'Available in Sprint 5' },
  { label: 'Pending Feedback', value: '—', rail: 'bg-rose-500',    sub: 'Available in Sprint 5' },
];

export default function ManagerDashboard() {
  const { user } = useAuth();

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

      {/* KPI cards — 4 columns with left colour rail */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {KPI_PLACEHOLDERS.map(kpi => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-5 pr-5 py-5"
          >
            <div className={`absolute left-0 inset-y-0 w-1 ${kpi.rail}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {kpi.label}
            </p>
            <p className="text-3xl font-bold text-slate-900 leading-none">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-2">{kpi.sub}</p>
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

        <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-40 cursor-not-allowed select-none">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" className="text-slate-400">
              <path d="M1.5 11.5l3.5-4.5 3 2 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900">Analytics</p>
          <p className="text-sm text-slate-500 mt-1">BI dashboards — available in Sprint 5</p>
        </div>
      </div>
    </AppShell>
  );
}