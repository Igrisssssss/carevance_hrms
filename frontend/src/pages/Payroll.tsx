import { useEffect, useMemo, useState } from 'react';
import { notificationApi, payrollApi } from '@/services/api';
import type { PayrollComponent, PayrollStructure, Payslip } from '@/types';
import { Bell, Download, FileSpreadsheet, IndianRupee, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type OrgUser = { id: number; name: string; email: string; role: string };

const emptyComponent = (): PayrollComponent => ({ name: '', calculation_type: 'fixed', amount: 0 });

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function Payroll() {
  const { user } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [structures, setStructures] = useState<PayrollStructure[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [periodMonth, setPeriodMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [allowances, setAllowances] = useState<PayrollComponent[]>([emptyComponent()]);
  const [deductions, setDeductions] = useState<PayrollComponent[]>([emptyComponent()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedPayslipIds, setSelectedPayslipIds] = useState<number[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [isDeletingStructure, setIsDeletingStructure] = useState(false);
  const [notifyType, setNotifyType] = useState<'announcement' | 'news'>('announcement');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const activeStructure = useMemo(
    () => structures.find((s) => s.user_id === selectedUserId && s.is_active),
    [structures, selectedUserId]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    const current = structures.find((s) => s.user_id === selectedUserId && s.is_active);
    if (!current) {
      setBasicSalary(0);
      setCurrency('INR');
      setAllowances([emptyComponent()]);
      setDeductions([emptyComponent()]);
      return;
    }
    setBasicSalary(Number(current.basic_salary || 0));
    setCurrency((current.currency || 'INR') as 'INR' | 'USD');
    setEffectiveFrom(current.effective_from || new Date().toISOString().slice(0, 10));
    setAllowances(current.allowances?.length ? current.allowances.map((a) => ({ ...a, amount: Number(a.amount ?? a.value ?? 0) })) : [emptyComponent()]);
    setDeductions(current.deductions?.length ? current.deductions.map((d) => ({ ...d, amount: Number(d.amount ?? d.value ?? 0) })) : [emptyComponent()]);
  }, [selectedUserId, structures]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [sRes, pRes] = await Promise.all([payrollApi.getStructures(), payrollApi.getPayslips()]);
      setUsers(sRes.data.users || []);
      setStructures(sRes.data.structures || []);
      setPayslips(pRes.data.data || []);

      if (!selectedUserId && sRes.data.users?.length) {
        setSelectedUserId(sRes.data.users[0].id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateComponent = (
    list: PayrollComponent[],
    setter: React.Dispatch<React.SetStateAction<PayrollComponent[]>>,
    index: number,
    key: keyof PayrollComponent,
    value: string
  ) => {
    const next = [...list];
    if (key === 'amount') {
      next[index] = { ...next[index], [key]: Number(value || 0) };
    } else if (key === 'calculation_type') {
      next[index] = { ...next[index], [key]: value as 'fixed' | 'percentage' };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    setter(next);
  };

  const saveStructure = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await payrollApi.saveStructure({
        user_id: selectedUserId,
        basic_salary: basicSalary,
        currency,
        effective_from: effectiveFrom,
        allowances: allowances.filter((a) => a.name.trim() !== ''),
        deductions: deductions.filter((d) => d.name.trim() !== ''),
      });
      setMessage('Salary structure saved successfully');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save salary structure');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStructure = async () => {
    if (!activeStructure) {
      setError('No active structure to update.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await payrollApi.updateStructure(activeStructure.id, {
        basic_salary: basicSalary,
        currency,
        effective_from: effectiveFrom,
        allowances: allowances.filter((a) => a.name.trim() !== ''),
        deductions: deductions.filter((d) => d.name.trim() !== ''),
      });
      setMessage('Salary structure updated successfully');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update salary structure');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStructure = async () => {
    if (!activeStructure) return;
    if (!window.confirm('Delete this salary structure?')) return;

    setIsDeletingStructure(true);
    setMessage('');
    setError('');
    try {
      await payrollApi.deleteStructure(activeStructure.id);
      setMessage('Salary structure deleted');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete salary structure');
    } finally {
      setIsDeletingStructure(false);
    }
  };

  const generatePayslip = async () => {
    if (!selectedUserId) return;
    setIsGenerating(true);
    setMessage('');
    setError('');
    try {
      await payrollApi.generatePayslip({
        user_id: selectedUserId,
        period_month: periodMonth,
        payroll_structure_id: activeStructure?.id,
      });
      setMessage('Payslip generated successfully');
      const pRes = await payrollApi.getPayslips();
      setPayslips(pRes.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate payslip');
    } finally {
      setIsGenerating(false);
    }
  };

  const paySelected = async (ids?: number[]) => {
    const targetIds = ids && ids.length > 0 ? ids : selectedPayslipIds;
    if (targetIds.length === 0) return;
    setIsPaying(true);
    setMessage('');
    setError('');
    try {
      const response = await payrollApi.payNow({ payslip_ids: targetIds });
      setMessage(response.data?.message || 'Payment processed');
      setSelectedPayslipIds([]);
      const pRes = await payrollApi.getPayslips();
      setPayslips(pRes.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsPaying(false);
    }
  };

  const publishNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      setError('Please enter notification title and message');
      return;
    }

    setIsPublishing(true);
    setMessage('');
    setError('');
    try {
      await notificationApi.publish({
        type: notifyType,
        title: notifyTitle.trim(),
        message: notifyMessage.trim(),
      });
      setNotifyTitle('');
      setNotifyMessage('');
      setMessage('Notification sent to employees');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to publish notification');
    } finally {
      setIsPublishing(false);
    }
  };

  const downloadPdf = async (id: number) => {
    try {
      const response = await payrollApi.downloadPayslipPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
        <p className="text-gray-500 mt-1">Manage INR/USD salary structures, adjustments, payslips, and payments</p>
      </div>

      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Period (YYYY-MM)</label>
          <input
            type="month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={generatePayslip}
            disabled={isGenerating || !selectedUserId}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Payslip'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Salary Structure
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={saveStructure}
              disabled={isSaving || !selectedUserId}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save New'}
            </button>
            <button
              onClick={updateStructure}
              disabled={isSaving || !activeStructure}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={deleteStructure}
              disabled={isDeletingStructure || !activeStructure}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {isDeletingStructure ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Basic Salary</label>
            <input
              type="number"
              min="0"
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value || 0))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <ComponentEditor title="Allowances" items={allowances} setItems={setAllowances} updateComponent={updateComponent} />
        <ComponentEditor title="Deductions" items={deductions} setItems={setDeductions} updateComponent={updateComponent} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {isAdmin && (
          <div className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4" />
              Publish Notification (Admin)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select
                value={notifyType}
                onChange={(e) => setNotifyType(e.target.value as 'announcement' | 'news')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="announcement">Announcement</option>
                <option value="news">News</option>
              </select>
              <input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="Title"
                className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={publishNotification}
                disabled={isPublishing}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
            <textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              rows={2}
              placeholder="Message for employees"
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Generated Payslips
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => paySelected()}
            disabled={isPaying || selectedPayslipIds.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {isPaying ? 'Processing...' : `Pay Now (${selectedPayslipIds.length})`}
          </button>
          <span className="text-xs text-gray-500">Select one or many payslips to pay and auto-send salary credited notification.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allowances</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payslips.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={9}>No payslips generated yet.</td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedPayslipIds.includes(p.id)}
                        disabled={p.payment_status === 'paid'}
                        onChange={(e) => {
                          setSelectedPayslipIds((prev) =>
                            e.target.checked
                              ? [...prev, p.id]
                              : prev.filter((id) => id !== p.id)
                          );
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.user?.name || `User #${p.user_id}`}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.period_month}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatMoney(p.basic_salary, p.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatMoney(p.total_allowances, p.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatMoney(p.total_deductions, p.currency)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatMoney(p.net_salary, p.currency)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadPdf(p.id)} className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-900">
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                        {p.payment_status !== 'paid' && (
                          <button
                            onClick={() => paySelected([p.id])}
                            className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ComponentEditor({
  title,
  items,
  setItems,
  updateComponent,
}: {
  title: string;
  items: PayrollComponent[];
  setItems: React.Dispatch<React.SetStateAction<PayrollComponent[]>>;
  updateComponent: (
    list: PayrollComponent[],
    setter: React.Dispatch<React.SetStateAction<PayrollComponent[]>>,
    index: number,
    key: keyof PayrollComponent,
    value: string
  ) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setItems((prev) => [...prev, emptyComponent()])}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="grid grid-cols-12 gap-2 items-center">
            <input
              value={item.name}
              onChange={(e) => updateComponent(items, setItems, index, 'name', e.target.value)}
              placeholder="Component name"
              className="col-span-5 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={item.calculation_type}
              onChange={(e) => updateComponent(items, setItems, index, 'calculation_type', e.target.value)}
              className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.amount ?? 0}
              onChange={(e) => updateComponent(items, setItems, index, 'amount', e.target.value)}
              className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              className="col-span-1 text-red-600 hover:text-red-800 flex justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
