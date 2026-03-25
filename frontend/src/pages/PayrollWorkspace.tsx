import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/permissions';
import PayrollWorkspaceNav, { type PayrollWorkspaceTab } from '@/features/payroll/PayrollWorkspaceNav';
import PayrollOverviewView from '@/features/payroll/PayrollOverviewView';
import PayrollRunsView from '@/features/payroll/PayrollRunsView';
import PayrollProfilesView from '@/features/payroll/PayrollProfilesView';
import PayrollTemplatesView from '@/features/payroll/PayrollTemplatesView';
import PayrollAdjustmentsView from '@/features/payroll/PayrollAdjustmentsView';
import PayrollPayslipsView from '@/features/payroll/PayrollPayslipsView';
import PayrollReportsView from '@/features/payroll/PayrollReportsView';
import PayrollSettingsView from '@/features/payroll/PayrollSettingsView';

export type PayrollWorkspaceMode =
  | 'overview'
  | 'runs'
  | 'employees'
  | 'components'
  | 'reimbursements'
  | 'payslips'
  | 'reports'
  | 'settings';

const adminTabs: PayrollWorkspaceTab[] = [
  { label: 'Overview', to: '/payroll' },
  { label: 'Pay Runs', to: '/payroll/runs' },
  { label: 'Payroll Profiles', to: '/payroll/employees' },
  { label: 'Components', to: '/payroll/components' },
  { label: 'Adjustments', to: '/payroll/reimbursements' },
  { label: 'Payslips', to: '/payroll/payslips' },
  { label: 'Reports', to: '/payroll/reports' },
  { label: 'Settings', to: '/payroll/settings' },
];

export default function PayrollWorkspace({ mode }: { mode: PayrollWorkspaceMode }) {
  const { user } = useAuth();
  const canManage = hasAdminAccess(user);

  if (!canManage && mode !== 'payslips') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PayrollWorkspaceNav tabs={canManage ? adminTabs : adminTabs.filter((tab) => tab.to === '/payroll/payslips')} />

      {mode === 'overview' ? <PayrollOverviewView /> : null}
      {mode === 'runs' ? <PayrollRunsView /> : null}
      {mode === 'employees' ? <PayrollProfilesView /> : null}
      {mode === 'components' ? <PayrollTemplatesView /> : null}
      {mode === 'reimbursements' ? <PayrollAdjustmentsView /> : null}
      {mode === 'payslips' ? <PayrollPayslipsView /> : null}
      {mode === 'reports' ? <PayrollReportsView /> : null}
      {mode === 'settings' ? <PayrollSettingsView /> : null}
    </div>
  );
}
