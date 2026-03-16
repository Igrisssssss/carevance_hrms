import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, reportGroupApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/permissions';
import { queryKeys } from '@/lib/queryKeys';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import DataTable from '@/components/dashboard/DataTable';
import FilterPanel from '@/components/dashboard/FilterPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import { getWorkingDuration } from '@/lib/timeBreakdown';
import { BarChart3, Calendar, Clock, Download, TrendingUp, Users } from 'lucide-react';

type OrgUser = { id: number; name: string; email: string; role: string };
type Group = { id: number; name: string; users: OrgUser[] };

const toDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${h}h ${m}m`;
};

const formatLastActivity = (value?: string | null) => {
  if (!value) return 'No activity';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity';
  return parsed.toLocaleString();
};

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = hasAdminAccess(user);
  const [startDate, setStartDate] = useState(toDate(new Date(new Date().setDate(1))));
  const [endDate, setEndDate] = useState(toDate(new Date()));
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [filterMode, setFilterMode] = useState<'team' | 'user' | 'group'>(isAdmin ? 'team' : 'user');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [exportError, setExportError] = useState('');

  const reportScope: 'self' | 'organization' = isAdmin ? 'organization' : 'self';

  useEffect(() => {
    if (!isAdmin) {
      setFilterMode('user');
      setSelectedGroupIds([]);
    }
  }, [isAdmin]);

  const usersQuery = useQuery({
    queryKey: queryKeys.users({ period: 'all' }),
    queryFn: async () => {
      const response = await userApi.getAll({ period: 'all' });
      return (response.data || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })) as OrgUser[];
    },
  });

  const groupsQuery = useQuery({
    queryKey: queryKeys.reportGroups,
    queryFn: async () => {
      const response = await reportGroupApi.list();
      return (response.data?.data || []).map((g: any) => ({ id: g.id, name: g.name, users: g.users || [] })) as Group[];
    },
    enabled: isAdmin,
  });

  const reportsQuery = useQuery({
    queryKey: queryKeys.reports({
      startDate,
      endDate,
      reportType,
      reportScope,
      filterMode,
      selectedUserIds,
      selectedGroupIds,
      isAdmin,
    }),
    queryFn: async () => {
      const commonParams = { start_date: startDate, end_date: endDate, scope: reportScope };
      const reportPromise =
        reportType === 'daily'
          ? reportApi.daily({ date: startDate, scope: reportScope })
          : reportType === 'weekly'
            ? reportApi.weekly(commonParams)
            : reportApi.monthly(commonParams);

      const overallParams: any = { start_date: startDate, end_date: endDate };
      if (isAdmin) {
        if (filterMode === 'user' && selectedUserIds.length > 0) {
          overallParams.user_ids = selectedUserIds;
        }
        if (filterMode === 'group' && selectedGroupIds.length > 0) {
          overallParams.group_ids = selectedGroupIds;
        }
      }

      const [reportResponse, overallResponse] = await Promise.all([reportPromise, reportApi.overall(overallParams)]);

      return {
        reportData: reportResponse.data,
        overallData: overallResponse.data,
      };
    },
  });

  const handleExport = async () => {
    try {
      setExportError('');
      const response = await reportApi.export({
        start_date: startDate,
        end_date: endDate,
        user_ids: isAdmin && filterMode === 'user' && selectedUserIds.length > 0 ? selectedUserIds : undefined,
        group_ids: isAdmin && filterMode === 'group' && selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e?.response?.data?.message || 'Failed to export report.');
    }
  };

  const filteredLabel = useMemo(() => {
    if (!isAdmin) return 'My report';
    if (filterMode === 'user') return 'User report';
    if (filterMode === 'group') return 'Group report';
    return 'Team report';
  }, [isAdmin, filterMode]);

  const users = usersQuery.data || [];
  const groups = groupsQuery.data || [];
  const reportData = reportsQuery.data?.reportData || null;
  const overallData = reportsQuery.data?.overallData || null;
  const reportTotals = reportData as any;
  const byUser = overallData?.by_user || [];
  const topContributor = [...byUser].sort((a: any, b: any) => Number(b.total_duration || 0) - Number(a.total_duration || 0))[0];
  const highestIdle = [...byUser].sort((a: any, b: any) => Number(b.idle_percentage || 0) - Number(a.idle_percentage || 0))[0];
  const workingShare = Number(overallData?.summary?.total_duration || 0) > 0
    ? (getWorkingDuration(overallData?.summary) / Number(overallData?.summary?.total_duration || 0)) * 100
    : 0;

  if (usersQuery.isLoading || (isAdmin && groupsQuery.isLoading) || reportsQuery.isLoading) {
    return <PageLoadingState label="Loading reports..." />;
  }

  if (usersQuery.isError || groupsQuery.isError || reportsQuery.isError) {
    const message =
      (usersQuery.error as any)?.response?.data?.message ||
      (groupsQuery.error as any)?.response?.data?.message ||
      (reportsQuery.error as any)?.response?.data?.message ||
      'Failed to load report data.';

    return (
      <PageErrorState
        message={message}
        onRetry={() => {
          void usersQuery.refetch();
          void groupsQuery.refetch();
          void reportsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Report Dashboard"
        description={filteredLabel}
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_30%,#0284c7_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_50px_-20px_rgba(14,165,233,0.55)]"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        }
      />

      {exportError ? <FeedbackBanner tone="error" message={exportError} /> : null}

      <FilterPanel className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((type) => (
            <button key={type} onClick={() => setReportType(type)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${reportType === type ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm" />
          </div>
          {isAdmin ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
              <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as 'team' | 'user' | 'group')} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm">
                <option value="team">Team Report</option>
                <option value="user">User Report</option>
                <option value="group">Group Report</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <div className="text-sm text-gray-500">Employee view only shows your own data.</div>
            </div>
          )}
        </div>

        {isAdmin && filterMode === 'user' ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Users</label>
            <div className="grid max-h-36 grid-cols-1 gap-2 overflow-auto rounded-2xl border border-slate-200 p-3 md:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <label key={u.id} className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={(e) => setSelectedUserIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {isAdmin && filterMode === 'group' ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Groups</label>
            <div className="grid max-h-36 grid-cols-1 gap-2 overflow-auto rounded-2xl border border-slate-200 p-3 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <label key={g.id} className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={(e) => setSelectedGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)))}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </FilterPanel>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Tracked Time" value={formatDuration(overallData?.summary?.total_duration || reportTotals?.total_duration || 0)} icon={Calendar} accent="sky" />
          <MetricCard label="Working Time" value={formatDuration(getWorkingDuration(overallData?.summary) || getWorkingDuration(reportTotals))} icon={TrendingUp} accent="emerald" />
          <MetricCard label="Idle Time" value={formatDuration(overallData?.summary?.idle_duration || 0)} icon={Clock} accent="amber" />
          <MetricCard label="Users" value={String(overallData?.summary?.users_count || 0)} icon={Users} accent="violet" />
          <MetricCard label="Active Users" value={String(overallData?.summary?.active_users || 0)} icon={BarChart3} accent="slate" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SurfaceCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Top Contributor</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{topContributor?.user?.name || 'No data'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {topContributor ? `${formatDuration(topContributor.total_duration || 0)} logged in range` : 'No tracked duration in this range.'}
            </p>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Highest Idle Share</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{highestIdle?.user?.name || 'No data'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {highestIdle ? `${Number(highestIdle.idle_percentage || 0).toFixed(1)}% idle share` : 'No idle analytics available.'}
            </p>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Working Share</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{workingShare.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-500">Useful for operations, payroll review, and team-level planning.</p>
          </SurfaceCard>
        </div>

        <DataTable
          title="Working Details"
          description="Totals, idle share, and recent activity per user."
          rows={overallData?.by_user || []}
          emptyMessage="No report rows found."
          columns={[
            { key: 'user', header: 'User', render: (row: any) => <span className="font-medium text-slate-950">{row.user.name}</span> },
            { key: 'total', header: 'Tracked', render: (row: any) => formatDuration(row.total_duration || 0) },
            { key: 'working', header: 'Working', render: (row: any) => formatDuration(getWorkingDuration(row)) },
            { key: 'idle', header: 'Idle', render: (row: any) => formatDuration(row.idle_duration || 0) },
            { key: 'idle_percentage', header: 'Idle %', render: (row: any) => `${Number(row.idle_percentage || 0).toFixed(1)}%` },
            { key: 'activity', header: 'Last Activity', render: (row: any) => formatLastActivity(row.last_activity_at) },
            {
              key: 'working',
              header: 'Working',
              render: (row: any) => (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_working ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {row.is_working ? 'Yes' : 'No'}
                </span>
              ),
            },
          ]}
        />

        <DataTable
          title="Daily Summary"
          description="Day-by-day totals for the current reporting scope."
          rows={overallData?.by_day || []}
          emptyMessage="No daily summary rows found."
          columns={[
            { key: 'date', header: 'Date', render: (row: any) => row.date },
            { key: 'total_duration', header: 'Tracked', render: (row: any) => formatDuration(row.total_duration || 0) },
            { key: 'working_duration', header: 'Working', render: (row: any) => formatDuration(getWorkingDuration(row)) },
          ]}
        />
      </div>
    </div>
  );
}
