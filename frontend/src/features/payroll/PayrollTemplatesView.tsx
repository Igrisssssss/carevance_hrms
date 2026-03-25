import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { payrollWorkspaceApi } from '@/services/api';
import type { SalaryComponentMaster, SalaryTemplate } from '@/types';
import { Layers3, LayoutTemplate, Wallet } from 'lucide-react';
import { formatPayrollCurrency, payrollStatusTone } from '@/features/payroll/utils';

const emptyComponent = {
  name: '',
  code: '',
  category: 'allowance',
  value_type: 'fixed',
  default_value: 0,
  is_taxable: false,
  is_active: true,
};

export default function PayrollTemplatesView() {
  const [componentForm, setComponentForm] = useState<any>(emptyComponent);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCurrency, setTemplateCurrency] = useState('INR');
  const [templateRows, setTemplateRows] = useState<Array<{ salary_component_id: number; value_type: 'fixed' | 'percentage'; value: number; is_enabled: boolean }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const componentsQuery = useQuery({
    queryKey: ['payroll-workspace-components'],
    queryFn: async () => {
      const [componentsResponse, templatesResponse] = await Promise.all([
        payrollWorkspaceApi.getComponents(),
        payrollWorkspaceApi.getTemplates(),
      ]);

      return {
        components: componentsResponse.data.data,
        templates: templatesResponse.data.data,
      };
    },
  });

  const components = componentsQuery.data?.components || [];
  const templates = componentsQuery.data?.templates || [];
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;

  const templateTotal = useMemo(
    () => templateRows.reduce((sum, row) => sum + Number(row.value || 0), 0),
    [templateRows]
  );

  const createComponent = async () => {
    setFeedback(null);
    try {
      await payrollWorkspaceApi.createComponent(componentForm);
      setComponentForm(emptyComponent);
      setFeedback({ tone: 'success', message: 'Salary component created.' });
      await componentsQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to create salary component.' });
    }
  };

  const saveTemplate = async () => {
    setFeedback(null);
    try {
      const payload = {
        name: templateName,
        description: templateDescription,
        currency: templateCurrency,
        components: templateRows,
      };
      if (selectedTemplate) {
        await payrollWorkspaceApi.updateTemplate(selectedTemplate.id, payload);
      } else {
        await payrollWorkspaceApi.createTemplate(payload);
      }
      setFeedback({ tone: 'success', message: selectedTemplate ? 'Template updated.' : 'Template created.' });
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCurrency('INR');
      setTemplateRows([]);
      setSelectedTemplateId(null);
      await componentsQuery.refetch();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to save salary template.' });
    }
  };

  const loadTemplate = (template: SalaryTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateCurrency(template.currency || 'INR');
    setTemplateRows(template.components.map((item) => ({
      salary_component_id: item.salary_component_id,
      value_type: item.value_type,
      value: Number(item.value || 0),
      is_enabled: item.is_enabled,
    })));
  };

  if (componentsQuery.isLoading) {
    return <PageLoadingState label="Loading salary components and templates..." />;
  }

  if (componentsQuery.isError) {
    return <PageErrorState message={(componentsQuery.error as any)?.response?.data?.message || 'Failed to load salary setup.'} onRetry={() => void componentsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll workspace"
        title="Salary Components / Templates"
        description="Create reusable component masters and combine them into salary templates that can be assigned to employee payroll profiles."
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Component Masters" value={components.length} hint="Reusable earning and deduction definitions" icon={Layers3} accent="sky" />
        <MetricCard label="Templates" value={templates.length} hint="Reusable salary structures" icon={LayoutTemplate} accent="emerald" />
        <MetricCard label="Active Templates" value={templates.filter((item) => item.is_active).length} hint="Enabled for assignments" icon={LayoutTemplate} accent="violet" />
        <MetricCard label="Builder Total" value={formatPayrollCurrency(templateTotal)} hint="Current template row sum" icon={Wallet} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="p-5">
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Component Master</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={componentForm.name} onChange={(event) => setComponentForm((current: any) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Code</FieldLabel>
              <TextInput value={componentForm.code} onChange={(event) => setComponentForm((current: any) => ({ ...current, code: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <SelectInput value={componentForm.category} onChange={(event) => setComponentForm((current: any) => ({ ...current, category: event.target.value }))}>
                {['basic', 'allowance', 'overtime', 'bonus', 'reimbursement', 'penalty', 'tax', 'deduction', 'other'].map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Value Type</FieldLabel>
              <SelectInput value={componentForm.value_type} onChange={(event) => setComponentForm((current: any) => ({ ...current, value_type: event.target.value }))}>
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Default Value</FieldLabel>
              <TextInput type="number" value={Number(componentForm.default_value || 0)} onChange={(event) => setComponentForm((current: any) => ({ ...current, default_value: Number(event.target.value || 0) }))} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={componentForm.is_taxable} onChange={(event) => setComponentForm((current: any) => ({ ...current, is_taxable: event.target.checked }))} />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={componentForm.is_active} onChange={(event) => setComponentForm((current: any) => ({ ...current, is_active: event.target.checked }))} />
                Active
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={createComponent}>Create Component</Button>
            <Button variant="secondary" onClick={() => setComponentForm(emptyComponent)}>Reset</Button>
          </div>

          <div className="mt-6 space-y-3">
            {components.map((component: SalaryComponentMaster) => (
              <div key={component.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{component.name}</p>
                    <p className="text-sm text-slate-500">{component.code} • {component.category}</p>
                  </div>
                  <StatusBadge tone={payrollStatusTone(component.is_active ? 'approved' : 'rejected')}>{component.value_type}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Salary Template Builder</h3>
            <Button variant="secondary" size="sm" onClick={() => { setSelectedTemplateId(null); setTemplateName(''); setTemplateDescription(''); setTemplateCurrency('INR'); setTemplateRows([]); }}>
              New Template
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Template Name</FieldLabel>
              <TextInput value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <TextInput value={templateCurrency} onChange={(event) => setTemplateCurrency(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextInput value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {components.map((component) => {
              const existing = templateRows.find((item) => item.salary_component_id === component.id);
              return (
                <div key={component.id} className="grid grid-cols-1 gap-3 rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(existing)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setTemplateRows((current) => [...current, { salary_component_id: component.id, value_type: component.value_type, value: component.default_value, is_enabled: true }]);
                        } else {
                          setTemplateRows((current) => current.filter((item) => item.salary_component_id !== component.id));
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700">{component.name}</span>
                  </label>
                  <SelectInput
                    value={existing?.value_type || component.value_type}
                    disabled={!existing}
                    onChange={(event) => setTemplateRows((current) => current.map((item) => item.salary_component_id === component.id ? { ...item, value_type: event.target.value as 'fixed' | 'percentage' } : item))}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </SelectInput>
                  <TextInput
                    type="number"
                    value={Number(existing?.value || component.default_value || 0)}
                    disabled={!existing}
                    onChange={(event) => setTemplateRows((current) => current.map((item) => item.salary_component_id === component.id ? { ...item, value: Number(event.target.value || 0) } : item))}
                  />
                  <StatusBadge tone={payrollStatusTone(component.is_active ? 'approved' : 'rejected')}>{component.category}</StatusBadge>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={saveTemplate} disabled={!templateName.trim()}>Save Template</Button>
            <Button variant="secondary" onClick={() => void componentsQuery.refetch()}>Refresh</Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => loadTemplate(template)}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${selectedTemplateId === template.id ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200/80 bg-slate-50/70 hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{template.name}</p>
                  <StatusBadge tone={payrollStatusTone(template.is_active ? 'approved' : 'rejected')}>{template.currency}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{template.components.length} components</p>
              </button>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
