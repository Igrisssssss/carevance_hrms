import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import FilterPanel from '@/components/dashboard/FilterPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import StatusBadge from '@/components/ui/StatusBadge';
import { payrollApi, payrollWorkspaceApi } from '@/services/api';
import type { PayrollRecord, PayrollRun, PayrollTransaction } from '@/types';
import { CheckCircle2, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { defaultPayrollMonth, formatPayrollCurrency, formatPayrollDuration, payrollGrossAmount, payrollStatusTone, payrollTotalDeductions } from '@/features/payroll/utils';

type OrgEmployee = { id: number; name: string; email: string; role: string };

export default function PayrollRunsView() {
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [transactions, setTransactions] = useState<PayrollTransaction[]>([]);
  const [payrollMonth, setPayrollMonth] = useState(defaultPayrollMonth());
  const [filterEmployeeId, setFilterEmployeeId] = useState<number | ''>('');
  const [filterPayrollStatus, setFilterPayrollStatus] = useState('');
  const [filterPayoutStatus, setFilterPayoutStatus] = useState('');
  const [generateEmployeeId, setGenerateEmployeeId] = useState<number | ''>('');
  const [generatePayoutMethod, setGeneratePayoutMethod] = useState<'mock' | 'stripe'>('mock');
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => ({
    gross: records.reduce((sum, item) => sum + payrollGrossAmount(item), 0),
    net: records.reduce((sum, item) => sum + Number(item.net_salary || 0), 0),
    processed: records.filter((item) => item.payroll_status === 'processed').length,
    failedPayouts: records.filter((item) => item.payout_status === 'failed').length,
  }), [records]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [employeeResponse, runResponse, recordResponse] = await Promise.all([
        payrollApi.getEmployees(),
        payrollWorkspaceApi.getRuns({ payroll_month: payrollMonth }),
        payrollApi.getRecords({
          payroll_month: payrollMonth,
          user_id: filterEmployeeId || undefined,
          payroll_status: (filterPayrollStatus || undefined) as any,
          payout_status: (filterPayoutStatus || undefined) as any,
        }),
      ]);

      setEmployees(employeeResponse.data.data || []);
      setRuns(runResponse.data.data || []);
      setRecords(recordResponse.data.data || []);

      const nextRun = selectedRun
        ? (runResponse.data.data || []).find((item) => item.id === selectedRun.id) || null
        : (runResponse.data.data || [])[0] || null;
      setSelectedRun(nextRun);
      if (nextRun) {
        const detail = await payrollWorkspaceApi.getRun(nextRun.id);
        setSelectedRun(detail.data.run);
      }

      if (selectedRecord) {
        const nextRecord = (recordResponse.data.data || []).find((item) => item.id === selectedRecord.id) || null;
        setSelectedRecord(nextRecord);
        if (nextRecord) {
          const transactionResponse = await payrollApi.getRecordTransactions(nextRecord.id);
          setTransactions(transactionResponse.data.data || []);
        }
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Failed to load pay runs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [payrollMonth, filterEmployeeId, filterPayrollStatus, filterPayoutStatus]);

  const selectRun = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      const detail = await payrollWorkspaceApi.getRun(run.id);
      setSelectedRun(detail.data.run);
    } catch {
      setSelectedRun(run);
    }
  };

  const selectRecord = async (record: PayrollRecord) => {
    setSelectedRecord(record);
    const response = await payrollApi.getRecordTransactions(record.id);
    setTransactions(response.data.data || []);
  };

  const saveSelectedRecord = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await payrollApi.updateRecord(selectedRecord.id, {
        basic_salary: Number(selectedRecord.basic_salary || 0),
        allowances: Number(selectedRecord.allowances || 0),
        deductions: Number(selectedRecord.deductions || 0),
        bonus: Number(selectedRecord.bonus || 0),
        tax: Number(selectedRecord.tax || 0),
        payout_method: selectedRecord.payout_method,
      });
      setSelectedRecord(response.data);
      setMessage('Payroll record updated.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Failed to update payroll record.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateRunStatus = async (status: string) => {
    if (!selectedRun) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await payrollWorkspaceApi.updateRunStatus(selectedRun.id, status);
      setMessage(`Pay run marked ${status}.`);
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Failed to update pay run status.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSelectedField = (field: keyof PayrollRecord, value: number | string) => {
    if (!selectedRecord) return;
    setSelectedRecord({ ...selectedRecord, [field]: value } as PayrollRecord);
  };

  const runPayout = async (simulateStatus?: 'success' | 'failed' | 'pending') => {
    if (!selectedRecord) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await saveSelectedRecord();
      const response = await payrollApi.payoutRecord(selectedRecord.id, {
        payout_method: selectedRecord.payout_method,
        simulate_status: simulateStatus,
      });
      setSelectedRecord(response.data.payroll);
      setTransactions((current) => [response.data.transaction, ...current]);
      setMessage('Payout action completed.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Failed to process payout.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateRun = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await payrollApi.generateRecords({
        payroll_month: payrollMonth,
        user_id: generateEmployeeId || undefined,
        payout_method: generatePayoutMethod,
        allow_overwrite: allowOverwrite,
      });
      setMessage(response.data.message || 'Payroll generation completed.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Failed to generate payroll.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoadingState label="Loading pay runs..." />;
  }

  if (error && records.length === 0 && runs.length === 0) {
    return <PageErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Pay Runs"
        description="Generate payroll, review month-level runs, inspect salary breakdowns, and continue using the existing payout and transaction flow without replacing it."
      />

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <FilterPanel className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div>
          <FieldLabel>Payroll Month</FieldLabel>
          <TextInput type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
        </div>
        <div>
          <FieldLabel>Generate For</FieldLabel>
          <SelectInput value={generateEmployeeId} onChange={(event) => setGenerateEmployeeId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Payout Method</FieldLabel>
          <SelectInput value={generatePayoutMethod} onChange={(event) => setGeneratePayoutMethod(event.target.value as 'mock' | 'stripe')}>
            <option value="mock">Mock</option>
            <option value="stripe">Stripe</option>
          </SelectInput>
        </div>
        <div className="flex items-end">
          <label className="flex min-h-11 items-center gap-2 rounded-[20px] border border-slate-200/90 bg-white/85 px-3.5 text-sm text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.25)]">
            <input type="checkbox" checked={allowOverwrite} onChange={(event) => setAllowOverwrite(event.target.checked)} />
            Allow overwrite
          </label>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={generateRun} disabled={isSaving}>Generate Payroll</Button>
        </div>
      </FilterPanel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross Payroll" value={formatPayrollCurrency(summary.gross)} hint="Across filtered records" icon={Wallet} accent="sky" />
        <MetricCard label="Net Payroll" value={formatPayrollCurrency(summary.net)} hint="Across filtered records" icon={Wallet} accent="emerald" />
        <MetricCard label="Processed Records" value={summary.processed} hint="Ready for payout review" icon={CheckCircle2} accent="violet" />
        <MetricCard label="Failed Payouts" value={summary.failedPayouts} hint="Retry directly from the detail panel" icon={RotateCcw} accent="rose" />
      </div>

      <SurfaceCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Pay Run Timeline</h3>
            <p className="mt-1 text-sm text-slate-500">Month-level payroll runs built on top of the existing payroll records.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No pay runs available yet for this month.</p>
          ) : runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => void selectRun(run)}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${selectedRun?.id === run.id ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200/80 bg-slate-50/70 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{run.run_code}</p>
                  <p className="text-sm text-slate-500">{run.payroll_month}</p>
                </div>
                <StatusBadge tone={payrollStatusTone(run.status)}>{run.status}</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Gross</p>
                  <p className="font-semibold text-slate-950">{formatPayrollCurrency(run.gross_payroll || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Net</p>
                  <p className="font-semibold text-slate-950">{formatPayrollCurrency(run.net_payroll || 0)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <FieldLabel>Employee</FieldLabel>
                <SelectInput value={filterEmployeeId} onChange={(event) => setFilterEmployeeId(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">All employees</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Payroll Status</FieldLabel>
                <SelectInput value={filterPayrollStatus} onChange={(event) => setFilterPayrollStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="processed">Processed</option>
                  <option value="paid">Paid</option>
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Payout Status</FieldLabel>
                <SelectInput value={filterPayoutStatus} onChange={(event) => setFilterPayoutStatus(event.target.value)}>
                  <option value="">All payouts</option>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </SelectInput>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full" onClick={() => { setFilterEmployeeId(''); setFilterPayrollStatus(''); setFilterPayoutStatus(''); }}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100/90">
            {records.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">No payroll records found for the current selection.</p>
            ) : records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => void selectRecord(record)}
                className={`grid w-full grid-cols-[1.3fr_0.8fr_0.8fr] gap-4 px-5 py-4 text-left transition hover:bg-slate-50/80 ${selectedRecord?.id === record.id ? 'bg-sky-50/70' : ''}`}
              >
                <div>
                  <p className="font-medium text-slate-950">{record.user?.name || `#${record.user_id}`}</p>
                  <p className="text-sm text-slate-500">{record.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Net salary</p>
                  <p className="font-semibold text-slate-950">{formatPayrollCurrency(record.net_salary)}</p>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <StatusBadge tone={payrollStatusTone(record.payroll_status)}>{record.payroll_status}</StatusBadge>
                  <StatusBadge tone={payrollStatusTone(record.payout_status)}>{record.payout_status}</StatusBadge>
                </div>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Detail Panel</h3>
          {selectedRun ? (
            <div className="mt-4 space-y-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{selectedRun.run_code}</p>
                  <p className="text-sm text-slate-500">{selectedRun.payroll_month}</p>
                </div>
                <StatusBadge tone={payrollStatusTone(selectedRun.status)}>{selectedRun.status}</StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Employees</p>
                  <p className="font-semibold text-slate-950">{selectedRun.items?.length || selectedRun.items_count || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Warnings</p>
                  <p className="font-semibold text-slate-950">{selectedRun.warnings?.length || selectedRun.warnings_count || 0}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => updateRunStatus('approved')} disabled={isSaving}>Approve Run</Button>
                <Button size="sm" variant="secondary" onClick={() => updateRunStatus('finalized')} disabled={isSaving}>Finalize</Button>
                <Button size="sm" variant="secondary" onClick={() => updateRunStatus('locked')} disabled={isSaving}>Lock Run</Button>
              </div>
            </div>
          ) : null}

          {!selectedRecord ? (
            <p className="mt-4 text-sm text-slate-500">Select a payroll record to review salary breakdown, attendance summary, payout history, and retry actions.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Basic</FieldLabel>
                  <TextInput type="number" value={Number(selectedRecord.basic_salary || 0)} onChange={(event) => updateSelectedField('basic_salary', Number(event.target.value || 0))} />
                </div>
                <div>
                  <FieldLabel>Allowances</FieldLabel>
                  <TextInput type="number" value={Number(selectedRecord.allowances || 0)} onChange={(event) => updateSelectedField('allowances', Number(event.target.value || 0))} />
                </div>
                <div>
                  <FieldLabel>Bonus</FieldLabel>
                  <TextInput type="number" value={Number(selectedRecord.bonus || 0)} onChange={(event) => updateSelectedField('bonus', Number(event.target.value || 0))} />
                </div>
                <div>
                  <FieldLabel>Deductions</FieldLabel>
                  <TextInput type="number" value={Number(selectedRecord.deductions || 0)} onChange={(event) => updateSelectedField('deductions', Number(event.target.value || 0))} />
                </div>
                <div>
                  <FieldLabel>Tax</FieldLabel>
                  <TextInput type="number" value={Number(selectedRecord.tax || 0)} onChange={(event) => updateSelectedField('tax', Number(event.target.value || 0))} />
                </div>
                <div>
                  <FieldLabel>Payout Method</FieldLabel>
                  <SelectInput value={selectedRecord.payout_method} onChange={(event) => updateSelectedField('payout_method', event.target.value)}>
                    <option value="mock">Mock</option>
                    <option value="stripe">Stripe</option>
                  </SelectInput>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Salary Breakdown</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Gross</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(payrollGrossAmount(selectedRecord))}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Total deductions</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(payrollTotalDeductions(selectedRecord))}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Net salary</span><span className="font-semibold text-slate-950">{formatPayrollCurrency(selectedRecord.net_salary)}</span></div>
                </div>
              </div>

              {selectedRun?.items?.find((item) => item.payroll_id === selectedRecord.id)?.attendance_summary ? (
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Attendance Summary</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-slate-500">Payable Days</p><p className="font-semibold text-slate-950">{selectedRun.items?.find((item) => item.payroll_id === selectedRecord.id)?.attendance_summary?.payable_days || 0}</p></div>
                    <div><p className="text-slate-500">Worked</p><p className="font-semibold text-slate-950">{formatPayrollDuration(Number(selectedRun.items?.find((item) => item.payroll_id === selectedRecord.id)?.attendance_summary?.worked_seconds || 0))}</p></div>
                    <div><p className="text-slate-500">Overtime</p><p className="font-semibold text-slate-950">{formatPayrollDuration(Number(selectedRun.items?.find((item) => item.payroll_id === selectedRecord.id)?.attendance_summary?.overtime_seconds || 0))}</p></div>
                    <div><p className="text-slate-500">Leave Days</p><p className="font-semibold text-slate-950">{selectedRun.items?.find((item) => item.payroll_id === selectedRecord.id)?.attendance_summary?.approved_leave_days || 0}</p></div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={saveSelectedRecord} disabled={isSaving}>Save Draft</Button>
                <Button size="sm" onClick={() => payrollApi.updateRecordStatus(selectedRecord.id, 'processed').then(() => load())} disabled={isSaving}>Mark Processed</Button>
                <Button size="sm" onClick={() => runPayout()} disabled={isSaving}><Wallet className="h-4 w-4" />Run Payout</Button>
                <Button size="sm" variant="secondary" onClick={() => runPayout('success')} disabled={isSaving}>Retry Success</Button>
                <Button size="sm" variant="danger" onClick={() => runPayout('failed')} disabled={isSaving}>Retry Failed</Button>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-950">Payout History</p>
                <div className="mt-3 space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-slate-500">No transactions recorded yet.</p>
                  ) : transactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-950">{transaction.provider}</p>
                        <StatusBadge tone={payrollStatusTone(transaction.status)}>{transaction.status}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{formatPayrollCurrency(transaction.amount, transaction.currency)}</p>
                      <p className="text-xs text-slate-500">{new Date(transaction.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
