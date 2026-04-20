import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ActivatePage from './pages/auth/ActivatePage';
import ProjectList from './pages/manager/ProjectList';
import ProjectDetail from './pages/manager/ProjectDetail';
import DesignerProjects from './pages/designer/DesignerProjects';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import DesignerDashboard from './pages/designer/DesignerDashboard';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjects from './pages/client/ClientProjects';
import ClientProjectDetail from './pages/client/ClientProjectDetail';
import DesignerProjectDetail from './pages/designer/DesignerProjectDetail';
import AnalyticsDashboard from './pages/manager/AnalyticsDashboard';
import ReportsPage from './pages/manager/ReportsPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Manager')  return <Navigate to="/manager"  replace />;
  if (user.role === 'Designer') return <Navigate to="/designer" replace />;
  if (user.role === 'Client')   return <Navigate to="/client"   replace />;
  return <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  if (user.role === 'Manager')  return <Navigate to="/manager"  replace />;
  if (user.role === 'Designer') return <Navigate to="/designer" replace />;
  if (user.role === 'Client')   return <Navigate to="/client"   replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/activate" element={<ActivatePage />} />

        {/* Manager */}
        <Route path="/manager" element={<ProtectedRoute allowedRoles={['Manager']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/manager/projects"    element={<ProtectedRoute allowedRoles={['Manager']}><ProjectList /></ProtectedRoute>} />
        <Route path="/manager/projects/:id" element={<ProtectedRoute allowedRoles={['Manager']}><ProjectDetail /></ProtectedRoute>} />
        <Route path="/manager/analytics"   element={<ProtectedRoute allowedRoles={['Manager']}><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/manager/reports"     element={<ProtectedRoute allowedRoles={['Manager']}><ReportsPage /></ProtectedRoute>} />

        {/* Designer */}
        <Route path="/designer" element={<ProtectedRoute allowedRoles={['Designer']}><DesignerDashboard /></ProtectedRoute>} />
        <Route path="/designer/projects"    element={<ProtectedRoute allowedRoles={['Designer']}><DesignerProjects /></ProtectedRoute>} />
        <Route path="/designer/projects/:id" element={<ProtectedRoute allowedRoles={['Designer']}><DesignerProjectDetail /></ProtectedRoute>} />

        {/* Client */}
        <Route path="/client" element={<ProtectedRoute allowedRoles={['Client']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/client/projects"    element={<ProtectedRoute allowedRoles={['Client']}><ClientProjects /></ProtectedRoute>} />
        <Route path="/client/projects/:id" element={<ProtectedRoute allowedRoles={['Client']}><ClientProjectDetail /></ProtectedRoute>} />

        <Route path="/" element={<RootRedirect />} />

      </Routes>
    </BrowserRouter>
  );
}