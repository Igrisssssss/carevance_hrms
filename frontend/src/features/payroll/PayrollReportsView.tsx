import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import DataTable from '@/components/dashboard/DataTable';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, TextInput } from '@/components/ui/FormField';
import { payrollWorkspaceApi } from '@/services/api';
import { BarChart3, Building2, Clock3, Wallet } from 'lucide-react';
import { defaultPayrollMonth, formatPayrollCurrency, formatPayrollDuration } from '@/features/payroll/utils';

export default function PayrollReportsView() {
  const [payrollMonth, setPayrollMonth] = useState(defaultPayrollMonth());

  const reportsQuery = useQuery({
    queryKey: ['payroll-workspace-reports', payrollMonth],
    queryFn: async () => {
      const response = await payrollWorkspaceApi.reports({ payroll_month: payrollMonth });
      return response.data;
    },
  });

  if (reportsQuery.isLoading) {
    return <PageLoadingState label="Loading payroll reports..." />;
  }

  if (reportsQuery.isError) {
    return <PageErrorState message={(reportsQuery.error as any)?.response?.data?.message || 'Failed to load payroll reports.'} onRetry={() => void reportsQuery.refetch()} />;
  }

  const reports = reportsQuery.data;
  const monthlySummary = reports.monthly_summary || {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Payroll Reports"
        description="Review monthly payroll summary, employee sheets, department cost, deductions, payout status, attendance versus payable days, and overtime across the current payroll cycle."
        actions={(
          <div className="min-w-[12rem]">
            <FieldLabel>Payroll Month</FieldLabel>
            <TextInput type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
          </div>
        )}
      />

      <FeedbackBanner tone="success" message="Reports are computed from the current payroll and pay-run data for the selected month." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross Payroll" value={formatPayrollCurrency(Number(monthlySummary.gross_payroll || 0))} hint="Monthly payroll summary" icon={Wallet} accent="sky" />
        <MetricCard label="Net Payroll" value={formatPayrollCurrency(Number(monthlySummary.net_payroll || 0))} hint="Monthly payroll summary" icon={Wallet} accent="emerald" />
        <MetricCard label="Employees" value={Number(monthlySummary.employees_count || 0)} hint="In current pay run" icon={Building2} accent="violet" />
        <MetricCard label="Overtime" value={formatPayrollDuration(Number(monthlySummary.overtime_seconds || 0))} hint="Approved overtime summary" icon={Clock3} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DataTable
          title="Employee Payroll Sheet"
          description="Employee-wise payroll sheet for the selected month."
          rows={reports.employee_payroll_sheet || []}
          emptyMessage="No payroll sheet data found."
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
            { key: 'payable_days', header: 'Payable Days', render: (row: any) => row.payable_days },
            { key: 'gross_pay', header: 'Gross Pay', render: (row: any) => formatPayrollCurrency(row.gross_pay || 0) },
            { key: 'total_deductions', header: 'Deductions', render: (row: any) => formatPayrollCurrency(row.total_deductions || 0) },
            { key: 'net_pay', header: 'Net Pay', render: (row: any) => formatPayrollCurrency(row.net_pay || 0) },
          ]}
        />

        <DataTable
          title="Department Payroll Cost"
          description="Payroll cost grouped by existing team / department groups."
          rows={reports.department_payroll_cost || []}
          emptyMessage="No department payroll cost data found."
          columns={[
            { key: 'name', header: 'Department', render: (row: any) => row.name },
            { key: 'employee_count', header: 'Employees', render: (row: any) => row.employee_count },
            { key: 'gross_pay', header: 'Gross Pay', render: (row: any) => formatPayrollCurrency(row.gross_pay || 0) },
            { key: 'net_pay', header: 'Net Pay', render: (row: any) => formatPayrollCurrency(row.net_pay || 0) },
          ]}
        />

        <DataTable
          title="Deductions Report"
          description="Deductions and tax totals by employee."
          rows={reports.deductions_report || []}
          emptyMessage="No deduction report data found."
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
            { key: 'deductions', header: 'Deductions', render: (row: any) => formatPayrollCurrency(row.deductions || 0) },
            { key: 'tax', header: 'Tax', render: (row: any) => formatPayrollCurrency(row.tax || 0) },
            { key: 'total_deductions', header: 'Total', render: (row: any) => formatPayrollCurrency(row.total_deductions || 0) },
          ]}
        />

        <DataTable
          title="Payout Status Report"
          description="Payout distribution for the selected payroll month."
          rows={reports.payout_status_report || []}
          emptyMessage="No payout report data found."
          columns={[
            { key: 'status', header: 'Status', render: (row: any) => row.status },
            { key: 'count', header: 'Count', render: (row: any) => row.count },
            { key: 'amount', header: 'Amount', render: (row: any) => formatPayrollCurrency(row.amount || 0) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-sky-100 text-sky-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Attendance Vs Payable Days</h3>
              <p className="text-sm text-slate-500">Attendance coverage against payable day calculations.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(reports.attendance_vs_payable_days || []).map((row: any) => (
              <div key={row.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{row.user?.name || 'Unknown'}</p>
                  <p className="text-sm font-semibold text-slate-950">{row.payable_days} payable days</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">Present {row.attendance_present_days} • Leave {row.approved_leave_days} • Worked {formatPayrollDuration(row.worked_seconds || 0)}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Overtime Summary</h3>
              <p className="text-sm text-slate-500">Employee-wise overtime totals used by the current pay run.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(reports.overtime_summary || []).map((row: any) => (
              <div key={row.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{row.user?.name || 'Unknown'}</p>
                  <p className="text-sm font-semibold text-slate-950">{formatPayrollDuration(row.overtime_seconds || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
