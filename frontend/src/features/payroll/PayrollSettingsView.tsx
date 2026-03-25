import { useEffect, useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, TextInput } from '@/components/ui/FormField';
import { payrollWorkspaceApi } from '@/services/api';

export default function PayrollSettingsView() {
  const [settings, setSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await payrollWorkspaceApi.settings();
      setSettings(response.data);
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to load payroll settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setFeedback(null);
    try {
      await payrollWorkspaceApi.updateSettings(settings);
      setFeedback({ tone: 'success', message: 'Payroll settings updated.' });
      await load();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to save payroll settings.' });
    }
  };

  if (isLoading) {
    return <PageLoadingState label="Loading payroll settings..." />;
  }

  if (!settings) {
    return <PageErrorState message={feedback?.message || 'Payroll settings are not available.'} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Payroll Settings"
        description="Manage payroll calendar, payout defaults, overtime rules, late deduction behavior, leave mapping, approvals, and payslip branding in modular cards."
        actions={<Button onClick={save}>Save Settings</Button>}
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Payroll Calendar</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Cutoff Day</FieldLabel>
              <TextInput type="number" value={Number(settings.payroll_calendar?.cutoff_day || 30)} onChange={(event) => setSettings((current: any) => ({ ...current, payroll_calendar: { ...current.payroll_calendar, cutoff_day: Number(event.target.value || 0) } }))} />
            </div>
            <div>
              <FieldLabel>Payment Day</FieldLabel>
              <TextInput type="number" value={Number(settings.payroll_calendar?.payment_day || 1)} onChange={(event) => setSettings((current: any) => ({ ...current, payroll_calendar: { ...current.payroll_calendar, payment_day: Number(event.target.value || 0) } }))} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Default Payout Method</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Method</FieldLabel>
              <TextInput value={settings.default_payout_method?.method || 'mock'} onChange={(event) => setSettings((current: any) => ({ ...current, default_payout_method: { ...current.default_payout_method, method: event.target.value } }))} />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <TextInput value={settings.default_payout_method?.currency || 'INR'} onChange={(event) => setSettings((current: any) => ({ ...current, default_payout_method: { ...current.default_payout_method, currency: event.target.value } }))} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Overtime Rules</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Enabled</FieldLabel>
              <TextInput value={String(Boolean(settings.overtime_rules?.enabled))} onChange={(event) => setSettings((current: any) => ({ ...current, overtime_rules: { ...current.overtime_rules, enabled: event.target.value === 'true' } }))} />
            </div>
            <div>
              <FieldLabel>Rate Multiplier</FieldLabel>
              <TextInput type="number" value={Number(settings.overtime_rules?.rate_multiplier || 1.5)} onChange={(event) => setSettings((current: any) => ({ ...current, overtime_rules: { ...current.overtime_rules, rate_multiplier: Number(event.target.value || 0) } }))} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Late Deduction Rules</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Enabled</FieldLabel>
              <TextInput value={String(Boolean(settings.late_deduction_rules?.enabled))} onChange={(event) => setSettings((current: any) => ({ ...current, late_deduction_rules: { ...current.late_deduction_rules, enabled: event.target.value === 'true' } }))} />
            </div>
            <div>
              <FieldLabel>Deduction Per Late Day</FieldLabel>
              <TextInput type="number" value={Number(settings.late_deduction_rules?.deduction_per_late_day || 0)} onChange={(event) => setSettings((current: any) => ({ ...current, late_deduction_rules: { ...current.late_deduction_rules, deduction_per_late_day: Number(event.target.value || 0) } }))} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Leave To Payroll Mapping</h3>
          <div className="mt-4">
            <FieldLabel>Approved Leave Counts As Payable Day</FieldLabel>
            <TextInput value={String(Boolean(settings.leave_mapping?.approved_leave_counts_as_payable_day))} onChange={(event) => setSettings((current: any) => ({ ...current, leave_mapping: { ...current.leave_mapping, approved_leave_counts_as_payable_day: event.target.value === 'true' } }))} />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Approval Workflow</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Adjustments Require Approval</FieldLabel>
              <TextInput value={String(Boolean(settings.approval_workflow?.adjustments_require_approval))} onChange={(event) => setSettings((current: any) => ({ ...current, approval_workflow: { ...current.approval_workflow, adjustments_require_approval: event.target.value === 'true' } }))} />
            </div>
            <div>
              <FieldLabel>Pay Run Requires Finalization</FieldLabel>
              <TextInput value={String(Boolean(settings.approval_workflow?.pay_run_requires_finalization))} onChange={(event) => setSettings((current: any) => ({ ...current, approval_workflow: { ...current.approval_workflow, pay_run_requires_finalization: event.target.value === 'true' } }))} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Payslip Branding</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Company Name</FieldLabel>
              <TextInput value={settings.payslip_branding?.company_name || ''} onChange={(event) => setSettings((current: any) => ({ ...current, payslip_branding: { ...current.payslip_branding, company_name: event.target.value } }))} />
            </div>
            <div>
              <FieldLabel>Accent Color</FieldLabel>
              <TextInput value={settings.payslip_branding?.accent_color || '#0f172a'} onChange={(event) => setSettings((current: any) => ({ ...current, payslip_branding: { ...current.payslip_branding, accent_color: event.target.value } }))} />
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
