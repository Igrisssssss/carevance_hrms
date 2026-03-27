import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import type { PayrollProfile, SalaryTemplate } from '@/types';

export type PayrollProfileFormValue = {
  user_id: number | '';
  salary_template_id: number | '';
  currency: string;
  payout_method: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_swift: string;
  payment_email: string;
  tax_identifier: string;
  payroll_eligible: boolean;
  reimbursements_eligible: boolean;
  is_active: boolean;
  bonus_amount: number;
  tax_amount: number;
  template_effective_from: string;
};

export const createEmptyPayrollProfileForm = (userId?: number): PayrollProfileFormValue => ({
  user_id: userId ?? '',
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
});

export const payrollProfileToForm = (profile?: PayrollProfile | null, lockedUserId?: number): PayrollProfileFormValue =>
  profile
    ? {
        user_id: lockedUserId ?? profile.user_id,
        salary_template_id: profile.salary_template_id || '',
        currency: profile.currency || 'INR',
        payout_method: profile.payout_method || 'mock',
        bank_name: profile.bank_name || '',
        bank_account_number: profile.bank_account_number || '',
        bank_ifsc_swift: profile.bank_ifsc_swift || '',
        payment_email: profile.payment_email || '',
        tax_identifier: profile.tax_identifier || '',
        payroll_eligible: profile.payroll_eligible,
        reimbursements_eligible: profile.reimbursements_eligible,
        is_active: profile.is_active,
        bonus_amount: Number(profile.bonus_amount || 0),
        tax_amount: Number(profile.tax_amount || 0),
        template_effective_from: new Date().toISOString().slice(0, 10),
      }
    : createEmptyPayrollProfileForm(lockedUserId);

export default function PayrollProfileForm({
  employees,
  templates,
  profile,
  lockedUserId,
  defaultUserId,
  lockedUserLabel,
  onSave,
  onReset,
  isSaving = false,
  saveLabel,
}: {
  employees: Array<{ id: number; name: string; email: string }>;
  templates: SalaryTemplate[];
  profile?: PayrollProfile | null;
  lockedUserId?: number;
  defaultUserId?: number;
  lockedUserLabel?: string;
  onSave: (value: PayrollProfileFormValue) => Promise<void> | void;
  onReset?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
}) {
  const [form, setForm] = useState<PayrollProfileFormValue>(profile ? payrollProfileToForm(profile, lockedUserId) : createEmptyPayrollProfileForm(defaultUserId ?? lockedUserId));

  useEffect(() => {
    setForm(profile ? payrollProfileToForm(profile, lockedUserId) : createEmptyPayrollProfileForm(defaultUserId ?? lockedUserId));
  }, [defaultUserId, profile, lockedUserId]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Employee</FieldLabel>
          {lockedUserId ? (
            <div className="min-h-11 rounded-[20px] border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              {lockedUserLabel || `Employee #${lockedUserId}`}
            </div>
          ) : (
            <SelectInput value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value ? Number(event.target.value) : '' }))}>
              <option value="">Select employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </SelectInput>
          )}
        </div>
        <div>
          <FieldLabel>Salary Template</FieldLabel>
          <SelectInput value={form.salary_template_id} onChange={(event) => setForm((current) => ({ ...current, salary_template_id: event.target.value ? Number(event.target.value) : '' }))}>
            <option value="">No template</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Template Effective From</FieldLabel>
          <TextInput type="date" value={form.template_effective_from} onChange={(event) => setForm((current) => ({ ...current, template_effective_from: event.target.value }))} />
        </div>
        <div>
          <FieldLabel>Payout Method</FieldLabel>
          <SelectInput value={form.payout_method} onChange={(event) => setForm((current) => ({ ...current, payout_method: event.target.value }))}>
            <option value="mock">Mock</option>
            <option value="stripe">Stripe</option>
            <option value="bank_transfer">Bank transfer</option>
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Bank Name</FieldLabel>
          <TextInput value={form.bank_name} onChange={(event) => setForm((current) => ({ ...current, bank_name: event.target.value }))} />
        </div>
        <div>
          <FieldLabel>Account Number</FieldLabel>
          <TextInput value={form.bank_account_number} onChange={(event) => setForm((current) => ({ ...current, bank_account_number: event.target.value }))} />
        </div>
        <div>
          <FieldLabel>IFSC / SWIFT</FieldLabel>
          <TextInput value={form.bank_ifsc_swift} onChange={(event) => setForm((current) => ({ ...current, bank_ifsc_swift: event.target.value }))} />
        </div>
        <div>
          <FieldLabel>Payment Email</FieldLabel>
          <TextInput type="email" value={form.payment_email} onChange={(event) => setForm((current) => ({ ...current, payment_email: event.target.value }))} />
        </div>
        <div>
          <FieldLabel>Default Bonus</FieldLabel>
          <TextInput type="number" value={Number(form.bonus_amount || 0)} onChange={(event) => setForm((current) => ({ ...current, bonus_amount: Number(event.target.value || 0) }))} />
        </div>
        <div>
          <FieldLabel>Default Tax</FieldLabel>
          <TextInput type="number" value={Number(form.tax_amount || 0)} onChange={(event) => setForm((current) => ({ ...current, tax_amount: Number(event.target.value || 0) }))} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Tax Identifier</FieldLabel>
          <TextInput value={form.tax_identifier} onChange={(event) => setForm((current) => ({ ...current, tax_identifier: event.target.value }))} />
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
              checked={Boolean(form[item.key as keyof PayrollProfileFormValue])}
              onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.checked }))}
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.user_id}>
          {saveLabel || (profile ? 'Update Profile' : 'Create Profile')}
        </Button>
        {onReset ? (
          <Button
            variant="secondary"
            onClick={() => {
              setForm(createEmptyPayrollProfileForm(defaultUserId ?? lockedUserId));
              onReset();
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
