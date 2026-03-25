import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { payrollWorkspaceApi } from '@/services/api';
import type { PayrollProfile } from '@/types';
import { Landmark, UserRound, Wallet } from 'lucide-react';
import { formatPayrollCurrency, payrollStatusTone } from '@/features/payroll/utils';

const emptyForm = {
  user_id: '',
  salary_template_id: '',
  currency: 'INR',
  payout_method: 'mock',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc_swift: '',
  payment_email: '',
  tax_identifier: '',
  payroll_eligible: true,
  reimbursements_eligible: true,
  is_active: true,
  bonus_amount: 0,
  tax_amount: 0,
  template_effective_from: new Date().toISOString().slice(0, 10),
};

export default function PayrollProfilesView() {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const profilesQuery = useQuery({
    queryKey: ['payroll-workspace-profiles'],
    queryFn: async () => {
      const response = await payrollWorkspaceApi.getProfiles();
      return response.data;
    },
  });

  const profiles = profilesQuery.data?.profiles || [];
  const employees = profilesQuery.data?.employees || [];
  const templates = profilesQuery.data?.templates || [];

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    if (selectedProfile) {
      setForm({
        user_id: selectedProfile.user_id,
        salary_template_id: selectedProfile.salary_template_id || '',
        currency: selectedProfile.currency || 'INR',
        payout_method: selectedProfile.payout_method || 'mock',
        bank_name: selectedProfile.bank_name || '',
        bank_account_number: selectedProfile.bank_account_number || '',
        bank_ifsc_swift: selectedProfile.bank_ifsc_swift || '',
        payment_email: selectedProfile.payment_email || '',
        tax_identifier: selectedProfile.tax_identifier || '',
        payroll_eligible: selectedProfile.payroll_eligible,
        reimbursements_eligible: selectedProfile.reimbursements_eligible,
        is_active: selectedProfile.is_active,
        bonus_amount: selectedProfile.bonus_amount || 0,
        tax_amount: selectedProfile.tax_amount || 0,
        template_effective_from: new Date().toISOString().slice(0, 10),
      });
      return;
    }

    if (!selectedProfileId) {
      setForm(emptyForm);
    }
  }, [selectedProfile, selectedProfileId]);

  const saveProfile = async () => {
    setFeedback(null);
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        user_id: Number(form.user_id),
        salary_template_id: form.salary_template_id ? Number(form.salary_template_id) : undefined,
        bonus_amount: Number(form.bonus_amount || 0),
        tax_amount: Number(form.tax_amount || 0),
      };

      if (selectedProfile) {
        await payrollWorkspaceApi.updateProfile(selectedProfile.id, payload);
      } else {
        await payrollWorkspaceApi.createProfile(payload);
      }

      setFeedback({ tone: 'success', message: selectedProfile ? 'Payroll profile updated.' : 'Payroll profile created.' });
      await profilesQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to save payroll profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (profilesQuery.isLoading) {
    return <PageLoadingState label="Loading payroll profiles..." />;
  }

  if (profilesQuery.isError) {
    return <PageErrorState message={(profilesQuery.error as any)?.response?.data?.message || 'Failed to load payroll profiles.'} onRetry={() => void profilesQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Employee Payroll Profiles"
        description="Extend existing employee records with payroll-only settings such as template assignment, payout details, bonus/tax defaults, and payroll eligibility."
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Profiles" value={profiles.length} hint="Payroll-specific employee records" icon={UserRound} accent="sky" />
        <MetricCard label="Eligible" value={profiles.filter((item) => item.payroll_eligible).length} hint="Marked payroll eligible" icon={Wallet} accent="emerald" />
        <MetricCard label="Reimbursement Eligible" value={profiles.filter((item) => item.reimbursements_eligible).length} hint="Can receive reimbursements" icon={Landmark} accent="violet" />
        <MetricCard label="Default Bonus" value={formatPayrollCurrency(profiles.reduce((sum, item) => sum + Number(item.bonus_amount || 0), 0))} hint="Configured bonus across profiles" icon={Wallet} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Employee Profiles</h3>
            <Button variant="secondary" size="sm" onClick={() => setSelectedProfileId(null)}>New Profile</Button>
          </div>
          <div className="mt-4 space-y-3">
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-500">No payroll profiles created yet.</p>
            ) : profiles.map((profile: PayrollProfile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedProfileId(profile.id)}
                className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${selectedProfileId === profile.id ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200/80 bg-slate-50/70 hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{profile.user?.name || `User #${profile.user_id}`}</p>
                    <p className="text-sm text-slate-500">{profile.user?.email}</p>
                  </div>
                  <StatusBadge tone={payrollStatusTone(profile.is_active ? 'approved' : 'rejected')}>{profile.is_active ? 'active' : 'inactive'}</StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Template: {profile.salary_template?.name || 'Not assigned'}</span>
                  <span>Payout: {profile.payout_method || 'n/a'}</span>
                </div>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{selectedProfile ? 'Update Payroll Profile' : 'Create Payroll Profile'}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <SelectInput value={form.user_id} onChange={(event) => setForm((current: any) => ({ ...current, user_id: event.target.value }))}>
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Salary Template</FieldLabel>
              <SelectInput value={form.salary_template_id} onChange={(event) => setForm((current: any) => ({ ...current, salary_template_id: event.target.value }))}>
                <option value="">No template</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Template Effective From</FieldLabel>
              <TextInput type="date" value={form.template_effective_from} onChange={(event) => setForm((current: any) => ({ ...current, template_effective_from: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Payout Method</FieldLabel>
              <SelectInput value={form.payout_method} onChange={(event) => setForm((current: any) => ({ ...current, payout_method: event.target.value }))}>
                <option value="mock">Mock</option>
                <option value="stripe">Stripe</option>
                <option value="bank_transfer">Bank transfer</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Bank Name</FieldLabel>
              <TextInput value={form.bank_name} onChange={(event) => setForm((current: any) => ({ ...current, bank_name: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Account Number</FieldLabel>
              <TextInput value={form.bank_account_number} onChange={(event) => setForm((current: any) => ({ ...current, bank_account_number: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>IFSC / SWIFT</FieldLabel>
              <TextInput value={form.bank_ifsc_swift} onChange={(event) => setForm((current: any) => ({ ...current, bank_ifsc_swift: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Payment Email</FieldLabel>
              <TextInput type="email" value={form.payment_email} onChange={(event) => setForm((current: any) => ({ ...current, payment_email: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Default Bonus</FieldLabel>
              <TextInput type="number" value={Number(form.bonus_amount || 0)} onChange={(event) => setForm((current: any) => ({ ...current, bonus_amount: Number(event.target.value || 0) }))} />
            </div>
            <div>
              <FieldLabel>Default Tax</FieldLabel>
              <TextInput type="number" value={Number(form.tax_amount || 0)} onChange={(event) => setForm((current: any) => ({ ...current, tax_amount: Number(event.target.value || 0) }))} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Tax Identifier</FieldLabel>
              <TextInput value={form.tax_identifier} onChange={(event) => setForm((current: any) => ({ ...current, tax_identifier: event.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {[
              { key: 'payroll_eligible', label: 'Payroll eligible' },
              { key: 'reimbursements_eligible', label: 'Reimbursement eligible' },
              { key: 'is_active', label: 'Active in payroll' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[item.key])}
                  onChange={(event) => setForm((current: any) => ({ ...current, [item.key]: event.target.checked }))}
                />
                {item.label}
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={saveProfile} disabled={isSaving || !form.user_id}>
              {selectedProfile ? 'Update Profile' : 'Create Profile'}
            </Button>
            <Button variant="secondary" onClick={() => { setSelectedProfileId(null); setForm(emptyForm); }}>
              Reset
            </Button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
