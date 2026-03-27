import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/permissions';
import PayrollWorkspaceNav, { type PayrollWorkspaceTab } from '@/features/payroll/PayrollWorkspaceNav';
import PayrollOverviewView from '@/features/payroll/PayrollOverviewView';
import PayrollRunsView from '@/features/payroll/PayrollRunsView';
import PayrollProfilesView from '@/features/payroll/PayrollProfilesView';
import PayrollComponentsView from '@/features/payroll/PayrollComponentsView';
import PayrollStructuresView from '@/features/payroll/PayrollStructuresView';
import PayrollAdjustmentsView from '@/features/payroll/PayrollAdjustmentsView';
import PayrollPayslipsView from '@/features/payroll/PayrollPayslipsView';
import PayrollReportsView from '@/features/payroll/PayrollReportsView';
import PayrollSettingsView from '@/features/payroll/PayrollSettingsView';
import PayrollEmployeeDetailView from '@/features/payroll/PayrollEmployeeDetailView';

export type PayrollWorkspaceMode =
  | 'overview'
  | 'runs'
  | 'employees'
  | 'components'
  | 'structures'
  | 'adjustments'
  | 'employee-detail'
  | 'payslips'
  | 'reports'
  | 'settings';

const adminTabs: PayrollWorkspaceTab[] = [
  { label: 'Overview', to: '/payroll' },
  { label: 'Pay Runs', to: '/payroll/runs' },
  { label: 'Employees', to: '/payroll/employees' },
  { label: 'Components', to: '/payroll/components' },
  { label: 'Structures', to: '/payroll/structures' },
  { label: 'Adjustments', to: '/payroll/adjustments' },
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
      {mode === 'employee-detail' ? <PayrollEmployeeDetailView /> : null}
      {mode === 'components' ? <PayrollComponentsView /> : null}
      {mode === 'structures' ? <PayrollStructuresView /> : null}
      {mode === 'adjustments' ? <PayrollAdjustmentsView /> : null}
      {mode === 'payslips' ? <PayrollPayslipsView /> : null}
      {mode === 'reports' ? <PayrollReportsView /> : null}
      {mode === 'settings' ? <PayrollSettingsView /> : null}
    </div>
  );
}
