import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import MetricCard from '@/components/dashboard/MetricCard';
import DataTable from '@/components/dashboard/DataTable';
import Button from '@/components/ui/Button';
import { FieldLabel, TextInput } from '@/components/ui/FormField';
import { PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { payrollWorkspaceApi } from '@/services/api';
import { Building2, Clock3, Download, Wallet } from 'lucide-react';
import PayrollSectionCard from '@/features/payroll/components/PayrollSectionCard';
import PayrollStatusBadge from '@/features/payroll/components/PayrollStatusBadge';
import { defaultPayrollMonth, formatPayrollCurrency, formatPayrollDuration, formatPayrollMonth } from '@/features/payroll/utils';

export default function PayrollReportsView() {
  const [payrollMonth, setPayrollMonth] = useState(defaultPayrollMonth());

  const reportsQuery = useQuery({
    queryKey: ['payroll-reports', payrollMonth],
    queryFn: async () => (await payrollWorkspaceApi.reports({ payroll_month: payrollMonth })).data,
  });

  if (reportsQuery.isLoading) {
    return <PageLoadingState label="Loading payroll reports..." />;
  }

  if (reportsQuery.isError) {
    return <PageErrorState message={(reportsQuery.error as any)?.response?.data?.message || 'Failed to load payroll reports.'} onRetry={() => void reportsQuery.refetch()} />;
  }

  const reports = reportsQuery.data;
  const monthlySummary = reports.monthly_summary || {};
  const trendRows = [...(reports.monthly_trend || [])].sort((left: any, right: any) => String(right.month || '').localeCompare(String(left.month || '')));
  const currentTrend = trendRows.find((row: any) => row.month === payrollMonth) || trendRows[0] || null;
  const previousTrend = currentTrend ? trendRows.find((row: any) => row.month !== currentTrend.month) || null : null;
  const netDelta = currentTrend && previousTrend ? Number(currentTrend.net_payroll || 0) - Number(previousTrend.net_payroll || 0) : null;
  const employeeDelta = currentTrend && previousTrend ? Number(currentTrend.employees_count || 0) - Number(previousTrend.employees_count || 0) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Payroll analytics"
        title="Payroll Reports"
        description="Executive payroll summary first, then denser finance and operations tables for employees, deductions, payouts, and payroll control."
        actions={(
          <>
            <div className="min-w-[12rem]">
              <FieldLabel>Payroll Month</FieldLabel>
              <TextInput type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" disabled>
                <Download className="h-4 w-4" />
                Export XLSX
              </Button>
            </div>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross Payroll" value={formatPayrollCurrency(Number(monthlySummary.gross_payroll || 0))} hint="Selected payroll cycle." icon={Wallet} accent="sky" />
        <MetricCard label="Net Payroll" value={formatPayrollCurrency(Number(monthlySummary.net_payroll || 0))} hint="Selected payroll cycle." icon={Wallet} accent="emerald" />
        <MetricCard label="Employees" value={Number(monthlySummary.employees_count || 0)} hint="Employees in the current run." icon={Building2} accent="violet" />
        <MetricCard label="Overtime" value={formatPayrollDuration(Number(monthlySummary.overtime_seconds || 0))} hint="Approved overtime included in payroll." icon={Clock3} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <PayrollSectionCard title="Reporting Controls" description="Operational reporting scope and export visibility for payroll admins and finance reviewers.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reporting month</p>
              <p className="mt-2 font-semibold text-slate-950">{formatPayrollMonth(payrollMonth)}</p>
              <p className="mt-2 text-sm text-slate-500">All summaries and tables below are scoped to this payroll cycle.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Exports</p>
              <p className="mt-2 font-semibold text-slate-950">Visible and ready for backend wiring</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="secondary" size="sm" disabled>
                  <Download className="h-4 w-4" />
                  Export XLSX
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-500">Dedicated report-export endpoints are the remaining backend step for full payroll downloads.</p>
            </div>
          </div>
        </PayrollSectionCard>

        <DataTable
          title="Payout Status Distribution"
          description="Current payout distribution for the selected run."
          rows={reports.payout_status_report || []}
          emptyMessage="No payout report data found."
          columns={[
            { key: 'status', header: 'Status', render: (row: any) => <PayrollStatusBadge status={row.status} /> },
            { key: 'count', header: 'Count', render: (row: any) => row.count },
            { key: 'amount', header: 'Amount', render: (row: any) => formatPayrollCurrency(row.amount || 0) },
          ]}
        />
      </div>

      {currentTrend && previousTrend ? (
        <PayrollSectionCard title="Period Comparison" description="Current cycle compared with the previous available payroll period.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Net payroll delta</p>
              <p className="mt-2 font-semibold text-slate-950">{formatPayrollCurrency(Number(netDelta || 0))}</p>
              <p className="mt-2 text-sm text-slate-500">{formatPayrollMonth(currentTrend.month)} vs {formatPayrollMonth(previousTrend.month)}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Employee delta</p>
              <p className="mt-2 font-semibold text-slate-950">{Number(employeeDelta || 0) >= 0 ? `+${Number(employeeDelta || 0)}` : Number(employeeDelta || 0)}</p>
              <p className="mt-2 text-sm text-slate-500">Employees moved in or out of the cycle.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Failed payouts</p>
              <p className="mt-2 font-semibold text-slate-950">{Number(currentTrend.failed_payouts || 0)}</p>
              <p className="mt-2 text-sm text-slate-500">Previous period: {Number(previousTrend.failed_payouts || 0)}</p>
            </div>
          </div>
        </PayrollSectionCard>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PayrollSectionCard title="Monthly Trend" description="Recent payroll trend across available pay runs.">
          <div className="space-y-3">
            {(reports.monthly_trend || []).length === 0 ? (
              <p className="text-sm text-slate-500">No monthly trend data is available yet.</p>
            ) : (reports.monthly_trend || []).map((row: any) => {
              const gross = Number(row.gross_payroll || 0);
              const net = Number(row.net_payroll || 0);
              const width = gross > 0 ? Math.max(12, Math.round((net / gross) * 100)) : 12;
              return (
                <div key={row.month} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{formatPayrollMonth(row.month)}</p>
                      <p className="mt-1 text-sm text-slate-500">{row.employees_count || 0} employees | {row.paid_count || 0} paid</p>
                    </div>
                    <PayrollStatusBadge status={row.failed_payouts ? `${row.failed_payouts} failed` : 'healthy'} />
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#0f172a_100%)]" style={{ width: `${width}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Gross {formatPayrollCurrency(gross)}</span>
                    <span className="font-medium text-slate-950">Net {formatPayrollCurrency(net)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </PayrollSectionCard>

        <DataTable
          title="Component Totals"
          description="Component-wise totals aggregated from the selected pay run."
          rows={reports.component_totals || []}
          emptyMessage="No component totals are available for this month."
          columns={[
            { key: 'component', header: 'Component', render: (row: any) => row.component },
            { key: 'category', header: 'Category', render: (row: any) => <PayrollStatusBadge status={row.category} /> },
            { key: 'amount', header: 'Amount', render: (row: any) => formatPayrollCurrency(Number(row.amount || 0)) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DataTable
          title="Employee Payroll Sheet"
          description="Employee-wise payroll sheet for the selected month."
          rows={reports.employee_payroll_sheet || []}
          emptyMessage="No payroll sheet data found."
          stickyHeader
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
            { key: 'payable_days', header: 'Payable Days', render: (row: any) => row.payable_days },
            { key: 'status', header: 'Payroll', render: (row: any) => <PayrollStatusBadge status={row.status} /> },
            { key: 'payout_status', header: 'Payout', render: (row: any) => <PayrollStatusBadge status={row.payout_status} /> },
            { key: 'gross_pay', header: 'Gross Pay', render: (row: any) => formatPayrollCurrency(row.gross_pay || 0) },
            { key: 'total_deductions', header: 'Deductions', render: (row: any) => formatPayrollCurrency(row.total_deductions || 0) },
            { key: 'net_pay', header: 'Net Pay', render: (row: any) => formatPayrollCurrency(row.net_pay || 0) },
          ]}
        />

        <DataTable
          title="Department Payroll Cost"
          description="Payroll cost grouped by existing team and department groups."
          rows={reports.department_payroll_cost || []}
          emptyMessage="No department payroll cost data found."
          stickyHeader
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
          stickyHeader
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
            { key: 'deductions', header: 'Deductions', render: (row: any) => formatPayrollCurrency(row.deductions || 0) },
            { key: 'tax', header: 'Tax', render: (row: any) => formatPayrollCurrency(row.tax || 0) },
            { key: 'total_deductions', header: 'Total', render: (row: any) => formatPayrollCurrency(row.total_deductions || 0) },
          ]}
        />

        <DataTable
          title="Attendance vs Payable Snapshot"
          description="Attendance coverage alongside payroll-calculated payable days."
          rows={reports.attendance_vs_payable_days || []}
          emptyMessage="No attendance snapshot data found."
          stickyHeader
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
            { key: 'payable_days', header: 'Payable Days', render: (row: any) => row.payable_days },
            { key: 'present', header: 'Present', render: (row: any) => row.attendance_present_days },
            { key: 'leave', header: 'Leave', render: (row: any) => row.approved_leave_days },
            { key: 'worked', header: 'Worked Time', render: (row: any) => formatPayrollDuration(row.worked_seconds || 0) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <DataTable
          title="Payout History"
          description="Recent payout transactions linked to payroll records for the selected month."
          rows={reports.payout_history || []}
          emptyMessage="No payout history is available for this month."
          stickyHeader
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Employee' },
            { key: 'provider', header: 'Provider', render: (row: any) => row.provider || 'N/A' },
            { key: 'reference', header: 'Reference', render: (row: any) => row.transaction_id || 'No reference' },
            { key: 'created_at', header: 'Created', render: (row: any) => row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A' },
            { key: 'status', header: 'Status', render: (row: any) => <PayrollStatusBadge status={row.status} /> },
            { key: 'amount', header: 'Amount', render: (row: any) => formatPayrollCurrency(Number(row.amount || 0), row.currency || 'INR') },
          ]}
        />

        <DataTable
          title="Failed Payout Report"
          description="Employees whose payout status is currently marked failed."
          rows={reports.failed_payout_report || []}
          emptyMessage="No failed payouts were reported for this run."
          stickyHeader
          columns={[
            { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Employee' },
            { key: 'net_pay', header: 'Net Pay', render: (row: any) => formatPayrollCurrency(Number(row.net_pay || 0)) },
            { key: 'status', header: 'Payout Status', render: (row: any) => <PayrollStatusBadge status={row.payout_status} /> },
            { key: 'warnings', header: 'Warnings', render: (row: any) => (row.warnings || []).length > 0 ? row.warnings.join(' | ') : 'No warning details' },
          ]}
        />
      </div>

      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
        Current reports are fully viewable in-app. Dedicated export generation for these workspace reports is the remaining backend step.
      </div>
    </div>
  );
}
