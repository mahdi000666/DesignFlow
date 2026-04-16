import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../components/AppShell';

export default function DesignerDashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-slate-900">
          Welcome back, {user?.full_name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Here are your active workspaces.
        </p>
      </div>

      {/* Navigation card */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/designer/projects"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" className="text-blue-700">
              <path d="M1.5 3.5a1 1 0 011-1H6l1.5 2H13a1 1 0 011 1v7a1 1 0 01-1 1H2.5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">My Projects</p>
          <p className="text-sm text-slate-500 mt-1">View your assigned projects and log time</p>
        </Link>
      </div>
    </AppShell>
  );
}