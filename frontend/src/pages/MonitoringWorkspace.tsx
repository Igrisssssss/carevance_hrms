import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi, reportApi, screenshotApi, userApi } from '@/services/api';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterPanel from '@/components/dashboard/FilterPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import DataTable from '@/components/dashboard/DataTable';
import Button from '@/components/ui/Button';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, TextInput } from '@/components/ui/FormField';
import { Activity, AppWindow, Camera, Check, ChevronDown, Globe, TimerReset, Users } from 'lucide-react';

type MonitoringWorkspaceMode = 'productive-time' | 'unproductive-time' | 'screenshots' | 'app-usage' | 'website-usage';

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const toDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const modeCopy: Record<MonitoringWorkspaceMode, { title: string; description: string; eyebrow: string }> = {
  'productive-time': {
    eyebrow: 'Monitoring',
    title: 'Productive Time',
    description: 'Review productive duration, top performers, and the organization’s most effective tools.',
  },
  'unproductive-time': {
    eyebrow: 'Monitoring',
    title: 'Unproductive Time',
    description: 'Inspect unproductive duration, low-efficiency teams, and tool usage dragging performance.',
  },
  screenshots: {
    eyebrow: 'Monitoring',
    title: 'Screenshots',
    description: 'Browse captured screenshots across the organization with employee-level filtering.',
  },
  'app-usage': {
    eyebrow: 'Monitoring',
    title: 'App Usage',
    description: 'Track application usage frequency and duration from recorded activity events.',
  },
  'website-usage': {
    eyebrow: 'Monitoring',
    title: 'Website Usage',
    description: 'Track website usage frequency and duration from recorded browsing activity events.',
  },
};

export default function MonitoringWorkspace({ mode }: { mode: MonitoringWorkspaceMode }) {
  const [startDate, setStartDate] = useState(toDate(monthStart));
  const [endDate, setEndDate] = useState(toDate(today));
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const employeeMenuRef = useRef<HTMLDivElement | null>(null);

  const usersQuery = useQuery({
    queryKey: ['monitoring-users'],
    queryFn: async () => {
      const response = await userApi.getAll({ period: 'all' });
      return response.data || [];
    },
  });

  const dataQuery = useQuery({
    queryKey: ['monitoring-workspace-data', mode, startDate, endDate, query, selectedUserId],
    queryFn: async () => {
      if (mode === 'productive-time' || mode === 'unproductive-time') {
        const response = await reportApi.employeeInsights({
          start_date: startDate,
          end_date: endDate,
          q: query || undefined,
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
        });
        return response.data;
      }

      if (mode === 'screenshots') {
        const response = await screenshotApi.getAll({
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          page: 1,
        });
        return response.data?.data || [];
      }

      const response = await activityApi.getAll({
        user_id: selectedUserId ? Number(selectedUserId) : undefined,
        type: mode === 'app-usage' ? 'app' : 'url',
        start_date: startDate,
        end_date: endDate,
        page: 1,
      });
      return response.data?.data || [];
    },
  });

  const isLoading = usersQuery.isLoading || dataQuery.isLoading;
  const isError = usersQuery.isError || dataQuery.isError;
  const users = usersQuery.data || [];
  const pageTitle = modeCopy[mode];
  const selectedEmployeeLabel =
    users.find((employee: any) => employee.id === selectedUserId)?.name || 'All employees';

  const insights = dataQuery.data as any;
  const screenshots = (dataQuery.data as any[]) || [];
  const activityRows = (dataQuery.data as any[]) || [];

  const aggregatedActivity = useMemo(() => {
    if (mode !== 'app-usage' && mode !== 'website-usage') return [];
    const mapped = new Map<string, { label: string; duration: number; count: number; users: Set<string> }>();

    activityRows.forEach((item: any) => {
      const key = item.name || 'Unknown';
      if (!mapped.has(key)) {
        mapped.set(key, { label: key, duration: 0, count: 0, users: new Set() });
      }
      const current = mapped.get(key)!;
      current.duration += Number(item.duration || 0);
      current.count += 1;
      if (item.user?.name) {
        current.users.add(item.user.name);
      }
    });

    return Array.from(mapped.values())
      .map((item) => ({ ...item, user_count: item.users.size }))
      .sort((a, b) => b.duration - a.duration);
  }, [activityRows, mode]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (employeeMenuRef.current && !employeeMenuRef.current.contains(target)) {
        setEmployeeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (isLoading) {
    return <PageLoadingState label={`Loading ${pageTitle.title.toLowerCase()}...`} />;
  }

  if (isError) {
    return (
      <PageErrorState
        message={(dataQuery.error as any)?.response?.data?.message || (usersQuery.error as any)?.response?.data?.message || 'Failed to load monitoring data.'}
        onRetry={() => {
          void usersQuery.refetch();
          void dataQuery.refetch();
        }}
      />
    );
  }

  const organizationSummary = insights?.organization_summary || {};
  const selectedUserTools = insights?.selected_user_tools || { productive: [], unproductive: [], neutral: [] };
  const organizationTools = insights?.organization_tools || { productive: [], unproductive: [] };
  const employeeRankings = insights?.employee_rankings?.by_productive_duration || [];
  const liveMonitoring = insights?.live_monitoring || { employees_active: [], employees_inactive: [], employees_on_leave: [] };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={pageTitle.eyebrow} title={pageTitle.title} description={pageTitle.description} />

      <FilterPanel className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <TextInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <TextInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div>
          <FieldLabel>Search</FieldLabel>
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Employee name or email" />
        </div>
        <div>
          <FieldLabel>Employee</FieldLabel>
          <div className="relative" ref={employeeMenuRef}>
            <button
              type="button"
              onClick={() => setEmployeeMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-[20px] border border-slate-200/90 bg-white/85 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.25)] outline-none transition duration-300 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-300/25"
            >
              <span className="truncate">{selectedEmployeeLabel}</span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${employeeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {employeeMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId('');
                    setEmployeeMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-sky-50"
                >
                  <span>All employees</span>
                  {selectedUserId === '' ? <Check className="h-4 w-4 text-sky-600" /> : null}
                </button>
                <div className="border-t border-slate-100">
                  {users.map((employee: any) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(Number(employee.id));
                        setEmployeeMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-sky-50"
                    >
                      <span className="truncate">{employee.name}</span>
                      {selectedUserId === employee.id ? <Check className="h-4 w-4 text-sky-600" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </FilterPanel>

      {(mode === 'productive-time' || mode === 'unproductive-time') && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={mode === 'productive-time' ? 'Productive Share' : 'Unproductive Share'}
              value={`${Number(mode === 'productive-time' ? organizationSummary.productive_share || 0 : organizationSummary.unproductive_share || 0).toFixed(1)}%`}
              hint="Organization average"
              icon={Activity}
              accent={mode === 'productive-time' ? 'emerald' : 'amber'}
            />
            <MetricCard
              label="Active Employees"
              value={liveMonitoring.employees_active?.length || 0}
              hint="Currently active now"
              icon={Users}
              accent="sky"
            />
            <MetricCard
              label="Inactive Employees"
              value={liveMonitoring.employees_inactive?.length || 0}
              hint="No recent activity"
              icon={TimerReset}
              accent="violet"
            />
            <MetricCard
              label="On Leave"
              value={liveMonitoring.employees_on_leave?.length || 0}
              hint="Leave approved today"
              icon={Users}
              accent="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable
              title={mode === 'productive-time' ? 'Top Productive Tools' : 'Top Unproductive Tools'}
              description="Organization-level tool rankings from employee monitoring analytics."
              rows={mode === 'productive-time' ? organizationTools.productive || [] : organizationTools.unproductive || []}
              emptyMessage="No tool analytics found."
              columns={[
                { key: 'label', header: 'Tool', render: (row: any) => row.label },
                { key: 'type', header: 'Type', render: (row: any) => row.type },
                { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.total_duration || 0) },
                { key: 'avg', header: 'Avg / Employee', render: (row: any) => formatDuration(row.avg_duration_per_employee || 0) },
              ]}
            />
            <DataTable
              title={mode === 'productive-time' ? 'Employee Ranking' : 'Selected Employee Risk Tools'}
              description={mode === 'productive-time' ? 'Ranked by productive duration.' : 'Focused view of tools classified as unproductive for the selected employee.'}
              rows={mode === 'productive-time' ? employeeRankings : selectedUserTools.unproductive || []}
              emptyMessage="No ranking data found."
              columns={
                mode === 'productive-time'
                  ? [
                      { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
                      { key: 'productive', header: 'Productive Time', render: (row: any) => formatDuration(row.productive_duration || 0) },
                      { key: 'total', header: 'Worked', render: (row: any) => formatDuration(row.total_duration || 0) },
                    ]
                  : [
                      { key: 'tool', header: 'Tool', render: (row: any) => row.label },
                      { key: 'type', header: 'Type', render: (row: any) => row.type },
                      { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.total_duration || 0) },
                    ]
              }
            />
          </div>
        </>
      )}

      {mode === 'screenshots' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Screenshots" value={screenshots.length} hint="Loaded from screenshot API" icon={Camera} accent="sky" />
            <MetricCard label="Employees" value={new Set(screenshots.map((item: any) => item.user?.id).filter(Boolean)).size} hint="Employees with screenshots" icon={Users} accent="emerald" />
            <MetricCard label="Selected Filter" value={selectedUserId || 'All'} hint="Current employee filter" icon={Activity} accent="violet" />
            <MetricCard label="Range" value={`${startDate} to ${endDate}`} hint="Date controls for workspace context" icon={TimerReset} accent="amber" />
          </div>

          {screenshots.length === 0 ? (
            <PageEmptyState title="No screenshots found" description="Captured screenshots will appear here when available." />
          ) : (
            <SurfaceCard className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {screenshots.map((shot: any) => (
                  <a
                    key={shot.id}
                    href={shot.path}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-white transition hover:border-sky-200 hover:shadow-[0_22px_50px_-34px_rgba(14,165,233,0.45)]"
                  >
                    <img src={shot.path} alt={`Screenshot ${shot.id}`} className="h-44 w-full object-cover" />
                    <div className="space-y-1 p-4">
                      <p className="font-medium text-slate-950">{shot.user?.name || 'Unknown employee'}</p>
                      <p className="text-xs text-slate-500">{new Date(shot.recorded_at).toLocaleString()}</p>
                    </div>
                  </a>
                ))}
              </div>
            </SurfaceCard>
          )}
        </>
      )}

      {(mode === 'app-usage' || mode === 'website-usage') && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tracked Tools" value={aggregatedActivity.length} hint="Unique names in current range" icon={mode === 'app-usage' ? AppWindow : Globe} accent="sky" />
            <MetricCard label="Events" value={activityRows.length} hint="Raw activity events" icon={Activity} accent="emerald" />
            <MetricCard label="Tracked Time" value={formatDuration(activityRows.reduce((sum: number, row: any) => sum + Number(row.duration || 0), 0))} hint="Duration across all events" icon={TimerReset} accent="amber" />
            <MetricCard label="Employees" value={new Set(activityRows.map((row: any) => row.user?.id).filter(Boolean)).size} hint="Employees in result set" icon={Users} accent="violet" />
          </div>

          <DataTable
            title={mode === 'app-usage' ? 'Application Usage' : 'Website Usage'}
            description="Aggregated duration, event count, and employee coverage for each tool."
            rows={aggregatedActivity}
            emptyMessage="No activity usage found."
            columns={[
              { key: 'label', header: 'Name', render: (row: any) => row.label },
              { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.duration || 0) },
              { key: 'count', header: 'Events', render: (row: any) => row.count },
              { key: 'users', header: 'Employees', render: (row: any) => row.user_count },
            ]}
          />

          <DataTable
            title="Raw Activity"
            description="Underlying activity events captured from the monitoring pipeline."
            rows={activityRows.slice().sort((a: any, b: any) => +new Date(b.recorded_at) - +new Date(a.recorded_at))}
            emptyMessage="No raw events found."
            columns={[
              { key: 'recorded_at', header: 'When', render: (row: any) => new Date(row.recorded_at).toLocaleString() },
              { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
              { key: 'name', header: 'Name', render: (row: any) => row.name },
              { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.duration || 0) },
            ]}
          />
        </>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => void dataQuery.refetch()}>
          Refresh data
        </Button>
      </div>
    </div>
  );
}
