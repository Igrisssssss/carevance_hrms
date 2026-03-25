import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { payrollApi } from '@/services/api';
import type { Payslip } from '@/types';
import { Download, FileText, Receipt, Wallet } from 'lucide-react';
import { defaultPayrollMonth, formatPayrollCurrency, payrollStatusTone } from '@/features/payroll/utils';
import { hasAdminAccess } from '@/lib/permissions';

export default function PayrollPayslipsView() {
  const { user } = useAuth();
  const canManage = hasAdminAccess(user);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; email: string; role: string }>>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>(canManage ? '' : Number(user?.id || 0));
  const [periodMonth, setPeriodMonth] = useState(defaultPayrollMonth());
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedIds = useMemo(() => selectedPayslip ? [selectedPayslip.id] : [], [selectedPayslip]);

  const load = async () => {
    setIsLoading(true);
    try {
      if (canManage) {
        const employeesResponse = await payrollApi.getEmployees();
        setEmployees(employeesResponse.data.data || []);
      }

      const payslipsResponse = await payrollApi.getPayslips({
        user_id: selectedUserId || undefined,
        period_month: periodMonth || undefined,
      });
      setPayslips(payslipsResponse.data.data || []);
      setSelectedPayslip((current) => (payslipsResponse.data.data || []).find((item) => item.id === current?.id) || null);
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to load payslips.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [selectedUserId, periodMonth]);

  const generatePayslip = async () => {
    if (!selectedUserId) return;
    setFeedback(null);
    try {
      const response = await payrollApi.generatePayslip({ user_id: Number(selectedUserId), period_month: periodMonth });
      setFeedback({ tone: 'success', message: `Payslip generated for ${response.data.user?.name || 'employee'}.` });
      await load();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to generate payslip.' });
    }
  };

  const markPaid = async () => {
    if (!selectedIds.length) return;
    setFeedback(null);
    try {
      const response = await payrollApi.payNow({ payslip_ids: selectedIds });
      setFeedback({ tone: 'success', message: response.data.message || 'Payslip marked paid.' });
      await load();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to update payslip payment status.' });
    }
  };

  const downloadPayslip = async (payslipId: number) => {
    try {
      const response = await payrollApi.downloadPayslipPdf(payslipId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to download payslip.' });
    }
  };

  if (isLoading) {
    return <PageLoadingState label="Loading payslips..." />;
  }

  if (feedback?.tone === 'error' && payslips.length === 0) {
    return <PageErrorState message={feedback.message} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Payslips"
        description={canManage ? 'View, generate, print, and mark payslips paid across the organization.' : 'View and download your payroll payslips for each processed month.'}
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Payslips" value={payslips.length} hint="In current filter" icon={FileText} accent="sky" />
        <MetricCard label="Paid" value={payslips.filter((item) => item.payment_status === 'paid').length} hint="Payment completed" icon={Wallet} accent="emerald" />
        <MetricCard label="Pending" value={payslips.filter((item) => item.payment_status !== 'paid').length} hint="Still pending" icon={Receipt} accent="amber" />
        <MetricCard label="Net Total" value={formatPayrollCurrency(payslips.reduce((sum, item) => sum + Number(item.net_salary || 0), 0))} hint="Combined net salary" icon={Wallet} accent="violet" />
      </div>

      <SurfaceCard className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {canManage ? (
            <div>
              <FieldLabel>Employee</FieldLabel>
              <SelectInput value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">All employees</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </SelectInput>
            </div>
          ) : null}
          <div>
            <FieldLabel>Period Month</FieldLabel>
            <TextInput type="month" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} />
          </div>
          {canManage ? (
            <>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full" onClick={generatePayslip} disabled={!selectedUserId}>Generate Payslip</Button>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={markPaid} disabled={!selectedIds.length}>Mark Selected Paid</Button>
              </div>
            </>
          ) : null}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.75fr]">
        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Payslip List</h3>
          <div className="mt-4 space-y-3">
            {payslips.length === 0 ? (
              <p className="text-sm text-slate-500">No payslips found for the current filter.</p>
            ) : payslips.map((payslip) => (
              <button
                key={payslip.id}
                type="button"
                onClick={() => setSelectedPayslip(payslip)}
                className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${selectedPayslip?.id === payslip.id ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200/80 bg-slate-50/70 hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{payslip.user?.name || `User #${payslip.user_id}`}</p>
                    <p className="text-sm text-slate-500">{payslip.period_month}</p>
                  </div>
                  <StatusBadge tone={payrollStatusTone(payslip.payment_status || 'pending')}>{payslip.payment_status || 'pending'}</StatusBadge>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-950">{formatPayrollCurrency(payslip.net_salary, payslip.currency)}</p>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Payslip Detail</h3>
          {!selectedPayslip ? (
            <p className="mt-4 text-sm text-slate-500">Select a payslip to review breakdown details and download the printable PDF.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{selectedPayslip.user?.name || `User #${selectedPayslip.user_id}`}</p>
                    <p className="text-sm text-slate-500">{selectedPayslip.period_month}</p>
                  </div>
                  <StatusBadge tone={payrollStatusTone(selectedPayslip.payment_status || 'pending')}>{selectedPayslip.payment_status || 'pending'}</StatusBadge>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Basic salary</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(selectedPayslip.basic_salary, selectedPayslip.currency)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Allowances</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(selectedPayslip.total_allowances, selectedPayslip.currency)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Deductions</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(selectedPayslip.total_deductions, selectedPayslip.currency)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Net salary</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(selectedPayslip.net_salary, selectedPayslip.currency)}</span></div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => void downloadPayslip(selectedPayslip.id)}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                {canManage ? (
                  <Button variant="secondary" onClick={markPaid} disabled={selectedPayslip.payment_status === 'paid'}>
                    Mark Paid
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
