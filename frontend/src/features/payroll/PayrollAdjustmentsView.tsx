import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { payrollWorkspaceApi } from '@/services/api';
import type { PayrollAdjustment } from '@/types';
import { Receipt, ShieldCheck, Wallet } from 'lucide-react';
import { adjustmentKindLabel, defaultPayrollMonth, formatPayrollCurrency, payrollStatusTone } from '@/features/payroll/utils';

const emptyAdjustment = {
  user_id: '',
  title: '',
  description: '',
  kind: 'reimbursement',
  effective_month: defaultPayrollMonth(),
  amount: 0,
  currency: 'INR',
  status: 'draft',
  reimbursement: {
    title: '',
    description: '',
    amount: 0,
    currency: 'INR',
  },
};

export default function PayrollAdjustmentsView() {
  const [form, setForm] = useState<any>(emptyAdjustment);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const adjustmentsQuery = useQuery({
    queryKey: ['payroll-workspace-adjustments', form.effective_month],
    queryFn: async () => {
      const response = await payrollWorkspaceApi.getAdjustments({ effective_month: form.effective_month });
      return response.data;
    },
  });

  const adjustments = adjustmentsQuery.data?.adjustments || [];
  const employees = adjustmentsQuery.data?.employees || [];

  const saveAdjustment = async () => {
    setFeedback(null);
    try {
      const payload = {
        ...form,
        user_id: Number(form.user_id),
        amount: Number(form.amount || 0),
        reimbursement: form.kind === 'reimbursement' ? {
          ...form.reimbursement,
          amount: Number(form.reimbursement?.amount || form.amount || 0),
        } : undefined,
      };

      if (selectedId) {
        await payrollWorkspaceApi.updateAdjustment(selectedId, payload);
      } else {
        await payrollWorkspaceApi.createAdjustment(payload);
      }

      setFeedback({ tone: 'success', message: selectedId ? 'Adjustment updated.' : 'Adjustment created.' });
      setForm(emptyAdjustment);
      setSelectedId(null);
      await adjustmentsQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to save adjustment.' });
    }
  };

  const updateStatus = async (adjustmentId: number, action: 'approve' | 'reject' | 'apply') => {
    setFeedback(null);
    try {
      if (action === 'approve') await payrollWorkspaceApi.approveAdjustment(adjustmentId);
      if (action === 'reject') await payrollWorkspaceApi.rejectAdjustment(adjustmentId);
      if (action === 'apply') await payrollWorkspaceApi.applyAdjustment(adjustmentId);
      setFeedback({ tone: 'success', message: `Adjustment ${action}d successfully.` });
      await adjustmentsQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to update adjustment status.' });
    }
  };

  const loadAdjustment = (adjustment: PayrollAdjustment) => {
    setSelectedId(adjustment.id);
    setForm({
      user_id: adjustment.user_id,
      title: adjustment.title,
      description: adjustment.description || '',
      kind: adjustment.kind,
      effective_month: adjustment.effective_month,
      amount: adjustment.amount,
      currency: adjustment.currency,
      status: adjustment.status,
      reimbursement: {
        title: adjustment.reimbursement?.title || adjustment.title,
        description: adjustment.reimbursement?.description || adjustment.description || '',
        amount: adjustment.reimbursement?.amount || adjustment.amount,
        currency: adjustment.reimbursement?.currency || adjustment.currency,
      },
    });
  };

  if (adjustmentsQuery.isLoading) {
    return <PageLoadingState label="Loading reimbursements and adjustments..." />;
  }

  if (adjustmentsQuery.isError) {
    return <PageErrorState message={(adjustmentsQuery.error as any)?.response?.data?.message || 'Failed to load adjustments.'} onRetry={() => void adjustmentsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Reimbursements / Adjustments"
        description="Manage reimbursements, bonuses, penalties, manual deductions, and other one-time payroll adjustments using the existing manager/admin approval pattern."
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Adjustments" value={adjustments.length} hint="Current month records" icon={Wallet} accent="sky" />
        <MetricCard label="Pending Approval" value={adjustments.filter((item) => item.status === 'pending_approval').length} hint="Needs reviewer action" icon={ShieldCheck} accent="amber" />
        <MetricCard label="Approved" value={adjustments.filter((item) => item.status === 'approved').length} hint="Ready to apply into payroll" icon={ShieldCheck} accent="emerald" />
        <MetricCard label="Total Amount" value={formatPayrollCurrency(adjustments.reduce((sum, item) => sum + Number(item.amount || 0), 0))} hint="Current filtered amount" icon={Receipt} accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{selectedId ? 'Update Adjustment' : 'Create Adjustment'}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <SelectInput value={form.user_id} onChange={(event) => setForm((current: any) => ({ ...current, user_id: event.target.value }))}>
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Kind</FieldLabel>
              <SelectInput value={form.kind} onChange={(event) => setForm((current: any) => ({ ...current, kind: event.target.value }))}>
                <option value="reimbursement">Reimbursement</option>
                <option value="bonus">Bonus</option>
                <option value="manual_deduction">Manual deduction</option>
                <option value="penalty">Penalty</option>
                <option value="one_time_adjustment">One-time adjustment</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Effective Month</FieldLabel>
              <TextInput type="month" value={form.effective_month} onChange={(event) => setForm((current: any) => ({ ...current, effective_month: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <TextInput type="number" value={Number(form.amount || 0)} onChange={(event) => setForm((current: any) => ({ ...current, amount: Number(event.target.value || 0) }))} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <TextInput value={form.title} onChange={(event) => setForm((current: any) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextInput value={form.description} onChange={(event) => setForm((current: any) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>

          {form.kind === 'reimbursement' ? (
            <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-950">Reimbursement Claim Details</p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Claim Title</FieldLabel>
                  <TextInput value={form.reimbursement.title} onChange={(event) => setForm((current: any) => ({ ...current, reimbursement: { ...current.reimbursement, title: event.target.value } }))} />
                </div>
                <div>
                  <FieldLabel>Claim Amount</FieldLabel>
                  <TextInput type="number" value={Number(form.reimbursement.amount || 0)} onChange={(event) => setForm((current: any) => ({ ...current, reimbursement: { ...current.reimbursement, amount: Number(event.target.value || 0) } }))} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button onClick={saveAdjustment} disabled={!form.user_id || !form.title.trim()}>Save Adjustment</Button>
            <Button variant="secondary" onClick={() => { setSelectedId(null); setForm(emptyAdjustment); }}>Reset</Button>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Adjustment Queue</h3>
          <div className="mt-4 space-y-3">
            {adjustments.length === 0 ? (
              <p className="text-sm text-slate-500">No adjustments found for the selected month.</p>
            ) : adjustments.map((adjustment) => (
              <div key={adjustment.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{adjustment.title}</p>
                    <p className="text-sm text-slate-500">{adjustment.user?.name} • {adjustmentKindLabel(adjustment.kind)}</p>
                  </div>
                  <StatusBadge tone={payrollStatusTone(adjustment.status)}>{adjustment.status}</StatusBadge>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-950">{formatPayrollCurrency(adjustment.amount, adjustment.currency)}</p>
                <p className="text-sm text-slate-500">{adjustment.description || 'No description provided.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => loadAdjustment(adjustment)}>Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(adjustment.id, 'approve')}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(adjustment.id, 'apply')}>Apply</Button>
                  <Button size="sm" variant="danger" onClick={() => updateStatus(adjustment.id, 'reject')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
