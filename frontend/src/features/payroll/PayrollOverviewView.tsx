import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, TextInput } from '@/components/ui/FormField';
import { payrollApi, payrollWorkspaceApi } from '@/services/api';
import { CalendarDays, FileCog, Receipt, RefreshCw, Send, Wallet } from 'lucide-react';
import { defaultPayrollMonth, formatPayrollCurrency, payrollStatusTone } from '@/features/payroll/utils';

export default function PayrollOverviewView() {
  const [payrollMonth, setPayrollMonth] = useState(defaultPayrollMonth());
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ['payroll-workspace-overview', payrollMonth],
    queryFn: async () => {
      const response = await payrollWorkspaceApi.overview({ payroll_month: payrollMonth });
      return response.data;
    },
  });

  const handleGenerate = async () => {
    setFeedback(null);
    setIsGenerating(true);
    try {
      const response = await payrollApi.generateRecords({ payroll_month: payrollMonth });
      setFeedback({ tone: 'success', message: response.data.message || 'Payroll generation completed.' });
      await overviewQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to generate payroll.' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (overviewQuery.isLoading) {
    return <PageLoadingState label="Loading payroll overview..." />;
  }

  if (overviewQuery.isError) {
    return <PageErrorState message={(overviewQuery.error as any)?.response?.data?.message || 'Failed to load payroll overview.'} onRetry={() => void overviewQuery.refetch()} />;
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Payroll Management"
        description="Generate payroll, review pay runs, and track payout readiness using the same connected attendance and time-tracking data already flowing through CareVance."
        actions={(
          <div className="flex items-end gap-3">
            <div className="min-w-[11rem]">
              <FieldLabel>Payroll Month</FieldLabel>
              <TextInput type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => void overviewQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        )}
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_30%,#0ea5e9_76%,#38bdf8_100%)] p-6 text-white shadow-[0_38px_100px_-48px_rgba(2,6,23,0.92)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-cyan-100/80">Connected payroll operations</p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Payroll built on real attendance, time, and payout data.</h2>
            <p className="text-sm leading-7 text-cyan-50/90">
              This month’s snapshot combines the existing payroll engine with attendance coverage, pending approvals, payout readiness, and profile completeness.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-white text-sky-700 hover:bg-sky-50">
              <Wallet className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Payroll'}
            </Button>
            <Link to="/payroll/runs" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20"><Send className="h-4 w-4" />Review Pay Run</Link>
            <Link to="/payroll/payslips" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20"><Receipt className="h-4 w-4" />Export Payroll</Link>
            <Link to="/payroll/settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20"><FileCog className="h-4 w-4" />Open Settings</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross Payroll" value={formatPayrollCurrency(overview.summary.gross_payroll)} hint="Current month total" icon={Wallet} accent="sky" />
        <MetricCard label="Net Payroll" value={formatPayrollCurrency(overview.summary.net_payroll)} hint="After deductions and tax" icon={Wallet} accent="emerald" />
        <MetricCard label="Employees In Run" value={overview.summary.employees_in_current_run} hint="Records in current cycle" icon={CalendarDays} accent="violet" />
        <MetricCard label="Pending Approvals" value={overview.summary.pending_approvals} hint="Leave, time edits, and adjustments" icon={FileCog} accent="amber" />
        <MetricCard label="Paid Count" value={overview.summary.paid_count} hint="Payroll records marked paid" icon={Send} accent="emerald" />
        <MetricCard label="Pending / Failed Payouts" value={overview.summary.failed_or_pending_payouts} hint="Needs payout attention" icon={Receipt} accent="rose" />
        <MetricCard label="Overtime Value" value={formatPayrollCurrency(overview.summary.total_overtime_value)} hint="Tracked overtime amount" icon={CalendarDays} accent="sky" />
        <MetricCard label="Reimbursements Pending" value={overview.summary.reimbursements_pending} hint="Draft and approval queue" icon={Receipt} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Current Pay Run Snapshot</h3>
              <p className="mt-1 text-sm text-slate-500">Latest pay-run rollup for the selected payroll month.</p>
            </div>
            {overview.current_pay_run ? <StatusBadge tone={payrollStatusTone(overview.current_pay_run.status)}>{overview.current_pay_run.status}</StatusBadge> : null}
          </div>
          {!overview.current_pay_run ? (
            <p className="mt-4 text-sm text-slate-500">No pay run exists for this month yet. Generate payroll to seed the run workspace.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Run Code</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{overview.current_pay_run.run_code}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Warnings</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{overview.current_pay_run.warnings?.length || 0}</p>
              </div>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Quick Links</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Salary setup', to: '/payroll/employees', value: overview.quick_links.profiles },
              { label: 'Salary templates', to: '/payroll/components', value: overview.quick_links.templates },
              { label: 'Payslips', to: '/payroll/payslips', value: overview.quick_links.payslips },
              { label: 'Reports', to: '/payroll/reports', value: overview.quick_links.adjustments },
            ].map((item) => (
              <Link key={item.to} to={item.to} className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-950">
                <span>{item.label}</span>
                <span className="text-slate-950">{item.value}</span>
              </Link>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Employees Missing Payroll Profile</h3>
          <div className="mt-4 space-y-3">
            {overview.missing_profiles.length === 0 ? (
              <p className="text-sm text-slate-500">No readiness warnings for this month.</p>
            ) : overview.missing_profiles.map((item) => (
              <div key={item.user_id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                <p className="font-medium text-slate-950">{item.name}</p>
                <p className="text-sm text-slate-500">{item.email}</p>
                <p className="mt-2 text-sm text-rose-600">{item.warnings.join(', ')}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Pending Approvals / Actions</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(overview.pending_actions).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                <span className="text-sm font-medium capitalize text-slate-700">{key.replace(/_/g, ' ')}</span>
                <span className="text-lg font-semibold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Recent Payroll Transactions</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.recent_transactions.length === 0 ? (
              <p className="text-sm text-slate-500">No recent payroll transactions yet.</p>
            ) : overview.recent_transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-950">{transaction.employee?.name || 'Employee'}</p>
                  <StatusBadge tone={payrollStatusTone(transaction.status)}>{transaction.status}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{transaction.provider}</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{formatPayrollCurrency(transaction.amount, transaction.currency)}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(transaction.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
