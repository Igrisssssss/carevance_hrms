import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/permissions';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import DesktopTimerDashboard from '@/pages/DesktopTimerDashboard';
import Projects from '@/pages/Projects';
import Tasks from '@/pages/Tasks';
import Reports from '@/pages/Reports';
import Invoices from '@/pages/Invoices';
import Settings from '@/pages/Settings';
import Monitoring from '@/pages/Monitoring';
import Attendance from '@/pages/Attendance';
import Chat from '@/pages/Chat';
import Payroll from '@/pages/Payroll';
import UserManagement from '@/pages/UserManagement';
import AuditLogs from '@/pages/AuditLogs';
import ApprovalInbox from '@/pages/ApprovalInbox';
import NotificationsCenter from '@/pages/NotificationsCenter';
import ReportsWorkspace from '@/pages/ReportsWorkspace';
import MonitoringWorkspace from '@/pages/MonitoringWorkspace';
import EmployeeManagementWorkspace from '@/pages/EmployeeManagementWorkspace';

const LandingPage = lazy(() => import('@/pages/LandingPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasAdminAccess(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user } = useAuth();
  const dashboardElement = window.desktopTracker ? <DesktopTimerDashboard /> : <Dashboard />;
  const effectiveDashboardElement = window.desktopTracker
    ? dashboardElement
    : hasAdminAccess(user)
      ? <AdminDashboard />
      : <Dashboard />;

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={effectiveDashboardElement} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="chat" element={<Chat />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="edit-time" element={<Attendance mode="time-edit" />} />
          <Route path="team" element={<Navigate to="/user-management" replace />} />
          <Route path="monitoring" element={<Navigate to="/monitoring/productive-time" replace />} />
          <Route path="monitoring/productive-time" element={<AdminRoute><MonitoringWorkspace mode="productive-time" /></AdminRoute>} />
          <Route path="monitoring/unproductive-time" element={<AdminRoute><MonitoringWorkspace mode="unproductive-time" /></AdminRoute>} />
          <Route path="monitoring/screenshots" element={<AdminRoute><MonitoringWorkspace mode="screenshots" /></AdminRoute>} />
          <Route path="monitoring/app-usage" element={<AdminRoute><MonitoringWorkspace mode="app-usage" /></AdminRoute>} />
          <Route path="monitoring/website-usage" element={<AdminRoute><MonitoringWorkspace mode="website-usage" /></AdminRoute>} />
          <Route path="approval-inbox" element={<AdminRoute><ApprovalInbox /></AdminRoute>} />
          <Route path="reports" element={<Navigate to="/reports/attendance" replace />} />
          <Route path="reports/attendance" element={<AdminRoute><ReportsWorkspace mode="attendance" /></AdminRoute>} />
          <Route path="reports/hours-tracked" element={<AdminRoute><ReportsWorkspace mode="hours-tracked" /></AdminRoute>} />
          <Route path="reports/projects-tasks" element={<AdminRoute><ReportsWorkspace mode="projects-tasks" /></AdminRoute>} />
          <Route path="reports/timeline" element={<AdminRoute><ReportsWorkspace mode="timeline" /></AdminRoute>} />
          <Route path="reports/web-app-usage" element={<AdminRoute><ReportsWorkspace mode="web-app-usage" /></AdminRoute>} />
          <Route path="reports/productivity" element={<AdminRoute><ReportsWorkspace mode="productivity" /></AdminRoute>} />
          <Route path="reports/custom-export" element={<AdminRoute><ReportsWorkspace mode="custom-export" /></AdminRoute>} />
          <Route path="invoices" element={<AdminRoute><Invoices /></AdminRoute>} />
          <Route path="payroll" element={<AdminRoute><Payroll /></AdminRoute>} />
          <Route path="user-management" element={<Navigate to="/employees" replace />} />
          <Route path="employees" element={<AdminRoute><EmployeeManagementWorkspace mode="employees" /></AdminRoute>} />
          <Route path="employees/teams" element={<AdminRoute><EmployeeManagementWorkspace mode="teams" /></AdminRoute>} />
          <Route path="employees/invitations" element={<AdminRoute><EmployeeManagementWorkspace mode="invitations" /></AdminRoute>} />
          <Route path="employees/roles" element={<AdminRoute><EmployeeManagementWorkspace mode="roles" /></AdminRoute>} />
          <Route path="audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
          <Route path="notifications" element={<NotificationsCenter />} />
          <Route path="settings" element={<Settings />} />
          <Route path="legacy/reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="legacy/monitoring" element={<AdminRoute><Monitoring /></AdminRoute>} />
          <Route path="legacy/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
