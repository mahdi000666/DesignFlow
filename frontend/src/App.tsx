import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, RootRedirect } from './components/RouteGuards';
import LoginPage from './pages/auth/LoginPage';
import ActivatePage from './pages/auth/ActivatePage';
import ProjectList from './pages/manager/ProjectList';
import ProjectDetail from './pages/manager/ProjectDetail';
import DesignerProjects from './pages/designer/DesignerProjects';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import DesignerDashboard from './pages/designer/DesignerDashboard';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjectDetail from './pages/client/ClientProjectDetail';
import DesignerProjectDetail from './pages/designer/DesignerProjectDetail';
import AnalyticsDashboard from './pages/manager/AnalyticsDashboard';
import TeamPage from './pages/manager/TeamPage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from './pages/auth/ResetPasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Settings — all authenticated roles */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['Manager', 'Designer', 'Client']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Manager */}
        <Route path="/manager" element={<ProtectedRoute allowedRoles={['Manager']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/manager/analytics" element={<ProtectedRoute allowedRoles={['Manager']}><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/manager/projects"  element={<ProtectedRoute allowedRoles={['Manager']}><ProjectList /></ProtectedRoute>} />
        <Route path="/manager/projects/:id" element={<ProtectedRoute allowedRoles={['Manager']}><ProjectDetail /></ProtectedRoute>} />
        <Route path="/manager/team"      element={<ProtectedRoute allowedRoles={['Manager']}><TeamPage /></ProtectedRoute>} />

        {/* Designer */}
        <Route path="/designer" element={<ProtectedRoute allowedRoles={['Designer']}><DesignerDashboard /></ProtectedRoute>} />
        <Route path="/designer/projects"     element={<ProtectedRoute allowedRoles={['Designer']}><DesignerProjects /></ProtectedRoute>} />
        <Route path="/designer/projects/:id" element={<ProtectedRoute allowedRoles={['Designer']}><DesignerProjectDetail /></ProtectedRoute>} />

        {/* Client */}
        <Route path="/client" element={<ProtectedRoute allowedRoles={['Client']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/client/projects/:id" element={<ProtectedRoute allowedRoles={['Client']}><ClientProjectDetail /></ProtectedRoute>} />

        <Route path="/" element={<RootRedirect />} />

      </Routes>
    </BrowserRouter>
  );
}