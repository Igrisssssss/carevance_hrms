import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/permissions';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const OwnerSignupPage = lazy(() => import('@/pages/OwnerSignupPage'));
const InviteSignupPage = lazy(() => import('@/pages/InviteSignupPage'));
const ContactSalesPage = lazy(() => import('@/pages/ContactSalesPage'));
const AcceptInvitePage = lazy(() => import('@/pages/AcceptInvitePage'));
const Layout = lazy(() => import('@/components/Layout'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const DesktopTimerDashboard = lazy(() => import('@/pages/DesktopTimerDashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Reports = lazy(() => import('@/pages/Reports'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Settings = lazy(() => import('@/pages/Settings'));
const Monitoring = lazy(() => import('@/pages/Monitoring'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const Chat = lazy(() => import('@/pages/Chat'));
const Payroll = lazy(() => import('@/pages/Payroll'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
const ApprovalInbox = lazy(() => import('@/pages/ApprovalInbox'));
const NotificationsCenter = lazy(() => import('@/pages/NotificationsCenter'));
const ReportsWorkspace = lazy(() => import('@/pages/ReportsWorkspace'));
const MonitoringWorkspace = lazy(() => import('@/pages/MonitoringWorkspace'));
const EmployeeManagementWorkspace = lazy(() => import('@/pages/EmployeeManagementWorkspace'));
const AddUserPage = lazy(() => import('@/pages/AddUserPage'));
const BillingSettingsPage = lazy(() => import('@/pages/BillingSettingsPage'));

function PayrollReturnBridge() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || location.pathname !== '/') {
      return;
    }

    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const payrollId = params.get('payroll_id');
    const checkoutSessionId = params.get('checkout_session_id');

    if (!payment || (!payrollId && !checkoutSessionId)) {
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login${location.search}`, { replace: true });
      return;
    }

    navigate(`${hasAdminAccess(user) ? '/payroll' : '/dashboard'}${location.search}`, { replace: true });
  }, [isAuthenticated, isLoading, location.pathname, location.search, navigate, user]);

  return null;
}

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
      <>
        <PayrollReturnBridge />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact-sales" element={<ContactSalesPage />} />
          <Route path="/book-demo" element={<Navigate to="/contact-sales" replace />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
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
                <OwnerSignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <InviteSignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup-owner"
            element={
              <PublicRoute>
                <OwnerSignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/start-trial"
            element={
              <PublicRoute>
                <OwnerSignupPage defaultMode="trial" />
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
            <Route path="add-user" element={<AdminRoute><AddUserPage /></AdminRoute>} />
            <Route path="users/add-user" element={<AdminRoute><AddUserPage /></AdminRoute>} />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/billing" element={<AdminRoute><BillingSettingsPage /></AdminRoute>} />
            <Route path="legacy/reports" element={<AdminRoute><Reports /></AdminRoute>} />
            <Route path="legacy/monitoring" element={<AdminRoute><Monitoring /></AdminRoute>} />
            <Route path="legacy/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </Suspense>
  );
}

export default App;
