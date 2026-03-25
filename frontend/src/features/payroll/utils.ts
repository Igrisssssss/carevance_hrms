import type { PayrollAdjustment, PayrollRecord } from '@/types';

export const formatPayrollCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export const formatPayrollDuration = (seconds: number) => {
  const safe = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const payrollStatusTone = (status?: string) => {
  switch (status) {
    case 'paid':
    case 'success':
    case 'approved':
    case 'applied':
      return 'success' as const;
    case 'processed':
    case 'pending':
    case 'pending_approval':
    case 'finalized':
    case 'locked':
      return 'warning' as const;
    case 'failed':
    case 'rejected':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
};

export const payrollGrossAmount = (record?: Partial<PayrollRecord> | null) =>
  Number(record?.basic_salary || 0) + Number(record?.allowances || 0) + Number(record?.bonus || 0);

export const payrollTotalDeductions = (record?: Partial<PayrollRecord> | null) =>
  Number(record?.deductions || 0) + Number(record?.tax || 0);

export const defaultPayrollMonth = () => new Date().toISOString().slice(0, 7);

export const adjustmentKindLabel = (kind: PayrollAdjustment['kind']) =>
  ({
    reimbursement: 'Reimbursement',
    bonus: 'Bonus',
    manual_deduction: 'Manual deduction',
    penalty: 'Penalty',
    one_time_adjustment: 'One-time adjustment',
  })[kind] || kind;
