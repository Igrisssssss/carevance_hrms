import type { ReactNode } from 'react';
import DashboardEmployeeSelector from '@/components/dashboard/DashboardEmployeeSelector';
import Button from '@/components/ui/Button';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { Download, RefreshCw } from 'lucide-react';

type DashboardScope = 'organization' | 'employee';
type DatePreset = 'today' | '7d' | '30d' | 'custom';

interface DashboardFilterBarProps {
  scope: DashboardScope;
  onScopeChange: (value: DashboardScope) => void;
  selectedEmployeeId: number | '';
  onEmployeeChange: (value: number | '') => void;
  employees: Array<{ id: number; name: string; email: string; role?: string }>;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
  actionSlot?: ReactNode;
}

export default function DashboardFilterBar({
  scope,
  onScopeChange,
  selectedEmployeeId,
  onEmployeeChange,
  employees,
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  onExport,
  isRefreshing = false,
  isExporting = false,
  actionSlot,
}: DashboardFilterBarProps) {
  return (
    <div className="relative z-30 grid grid-cols-1 gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 xl:grid-cols-[1.2fr_1.3fr_1fr_auto]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Scope</FieldLabel>
          <SelectInput value={scope} onChange={(event) => onScopeChange(event.target.value as DashboardScope)} aria-label="Dashboard scope">
            <option value="organization">All Employees</option>
            <option value="employee">Specific Employee</option>
          </SelectInput>
        </div>

        <div className="relative z-40">
          <FieldLabel>Employee</FieldLabel>
          <DashboardEmployeeSelector employees={employees} value={selectedEmployeeId} onChange={onEmployeeChange} disabled={scope !== 'employee'} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <FieldLabel>Date Range</FieldLabel>
          <SelectInput value={datePreset} onChange={(event) => onDatePresetChange(event.target.value as DatePreset)} aria-label="Date range">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom range</option>
          </SelectInput>
        </div>

        <div>
          <FieldLabel>Start Date</FieldLabel>
          <TextInput type="date" value={startDate} disabled={datePreset !== 'custom'} onChange={(event) => onStartDateChange(event.target.value)} />
        </div>

        <div>
          <FieldLabel>End Date</FieldLabel>
          <TextInput type="date" value={endDate} disabled={datePreset !== 'custom'} onChange={(event) => onEndDateChange(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-start gap-3 pt-[1.625rem] sm:justify-end">
        <Button variant="secondary" onClick={onRefresh} disabled={isRefreshing} className="min-w-[8.5rem] justify-center px-5">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={onExport} disabled={isExporting} className="min-w-[8.5rem] justify-center px-5">
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
        {actionSlot}
      </div>
    </div>
  );
}
