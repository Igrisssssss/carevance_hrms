import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { FeedbackBanner, PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { Plus, Send, CheckCircle } from 'lucide-react';

export default function Invoices() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState({
    client_name: '', client_email: '', client_address: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', notes: ''
  });

  const {
    data: invoices = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async () => {
      const res = await invoiceApi.getAll();
      return res.data.data || [];
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      await invoiceApi.create(formData as any);
    },
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Invoice created' });
      setShowModal(false);
      setFormData({ client_name: '', client_email: '', client_address: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
    onError: (mutationError: any) => {
      setFeedback({
        tone: 'error',
        message: mutationError?.response?.data?.message || 'Failed to create invoice.',
      });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'send' | 'paid' }) => {
      if (action === 'send') {
        await invoiceApi.send(id);
        return 'Invoice sent';
      }

      await invoiceApi.markPaid(id);
      return 'Invoice marked as paid';
    },
    onSuccess: async (message) => {
      setFeedback({ tone: 'success', message });
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
    onError: (mutationError: any) => {
      setFeedback({
        tone: 'error',
        message: mutationError?.response?.data?.message || 'Failed to update invoice.',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    await createInvoiceMutation.mutateAsync();
  };

  const handleSend = async (id: number) => {
    setFeedback(null);
    await updateInvoiceStatusMutation.mutateAsync({ id, action: 'send' });
  };

  const handleMarkPaid = async (id: number) => {
    setFeedback(null);
    await updateInvoiceStatusMutation.mutateAsync({ id, action: 'paid' });
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'paid': return 'bg-green-100 text-green-700'; case 'sent': return 'bg-blue-100 text-blue-700'; case 'overdue': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (isLoading) {
    return <PageLoadingState label="Loading invoices..." />;
  }

  if (isError) {
    return (
      <PageErrorState
        message={(error as any)?.response?.data?.message || 'Failed to load invoices.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Invoices</h1><p className="text-gray-500 mt-1">Manage your invoices</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="h-5 w-5" />New Invoice</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? <tr><td colSpan={6} className="px-6 py-8"><PageEmptyState title="No invoices yet" description="Create your first invoice to get started." /></td></tr> : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{inv.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${inv.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {inv.status === 'draft' && <button onClick={() => handleSend(inv.id)} className="p-1 text-blue-600 hover:text-blue-800"><Send className="h-4 w-4" /></button>}
                      {inv.status === 'sent' && <button onClick={() => handleMarkPaid(inv.id)} className="p-1 text-green-600 hover:text-green-800"><CheckCircle className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New Invoice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label><input type="text" required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label><input type="email" required value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label><input type="date" required value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancel</button><button type="submit" disabled={createInvoiceMutation.isPending} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-60">{createInvoiceMutation.isPending ? 'Creating...' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
