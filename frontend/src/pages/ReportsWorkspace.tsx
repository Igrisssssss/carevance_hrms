import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  activityApi,
  projectApi,
  reportApi,
  reportGroupApi,
  taskApi,
  timeEntryApi,
  userApi,
} from '@/services/api';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterPanel from '@/components/dashboard/FilterPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import DataTable from '@/components/dashboard/DataTable';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { getWorkingDuration } from '@/lib/timeBreakdown';
import {
  Activity,
  CalendarDays,
  Download,
  FolderKanban,
  LineChart,
  ListFilter,
  RefreshCw,
  TimerReset,
  Users,
  Waypoints,
} from 'lucide-react';

type ReportsWorkspaceMode =
  | 'attendance'
  | 'hours-tracked'
  | 'projects-tasks'
  | 'timeline'
  | 'web-app-usage'
  | 'productivity'
  | 'custom-export';

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const toDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};
const formatTimelineDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(Number.isFinite(Number(seconds)) ? Number(seconds) : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  if (hours > 0) {
    return remainingSeconds > 0 ? `${hours}h ${minutes}m ${remainingSeconds}s` : `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${remainingSeconds}s`;
};
const normalizeSearchValue = (value: unknown) => String(value ?? '').trim().toLowerCase();
const matchesWorkspaceSearch = (search: string, values: unknown[]) => !search || values.some((value) => normalizeSearchValue(value).includes(search));

const fetchTimeEntriesForUsers = async (userIds: number[], startDate: string, endDate: string) => {
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
  if (!uniqueUserIds.length) return [];

  const entryCollections = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const collectedEntries: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await timeEntryApi.getAll({
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          page: currentPage,
          per_page: 1000,
        });
        const payload = response.data;

        collectedEntries.push(...(payload.data || []));
        if (!payload.last_page || payload.current_page >= payload.last_page) {
          hasMorePages = false;
        } else {
          currentPage += 1;
        }
      }

      return collectedEntries;
    })
  );

  return entryCollections.flat();
};

const modeCopy: Record<ReportsWorkspaceMode, { title: string; description: string; eyebrow: string }> = {
  attendance: {
    eyebrow: 'Reports',
    title: 'Attendance Report',
    description: 'Attendance coverage, leave days, working status, and range-based employee summaries.',
  },
  'hours-tracked': {
    eyebrow: 'Reports',
    title: 'Hours Tracked',
    description: 'Tracked time, working time, idle time, and employee-level hour distribution.',
  },
  'projects-tasks': {
    eyebrow: 'Reports',
    title: 'Projects & Tasks',
    description: 'Project delivery, task allocation, and time consumed across active work items.',
  },

  timeline: {
    eyebrow: 'Reports',
    title: 'Timeline',
    description: 'Chronological activity feed across app, website, and idle events in the selected range.',
  },
  'web-app-usage': {
    eyebrow: 'Reports',
    title: 'Web & App Usage',
    description: 'Tool usage by employee with productive and unproductive classifications from current monitoring data.',
  },
  productivity: {
    eyebrow: 'Reports',
    title: 'Productivity Summary',
    description: 'Productive share, idle trends, and top contributors across the organization.',
  },
  'custom-export': {
    eyebrow: 'Reports',
    title: 'Custom Export',
    description: 'Generate CSV exports using the current date range and optional user or team filters.',
  },
};

export default function ReportsWorkspace({ mode }: { mode: ReportsWorkspaceMode }) {
  const [startDate, setStartDate] = useState(toDate(monthStart));
  const [endDate, setEndDate] = useState(toDate(today));
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');

  const usersQuery = useQuery({
    queryKey: ['report-workspace-users'],
    queryFn: async () => {
      const response = await userApi.getAll({ period: 'all' });
      return response.data || [];
    },
  });
  const groupsQuery = useQuery({
    queryKey: ['report-workspace-groups'],
    queryFn: async () => {
      const response = await reportGroupApi.list();
      return response.data?.data || [];
    },
  });
  const users = usersQuery.data || [];
  const groups = groupsQuery.data || [];
  const projectsTasksSearch = query.trim().toLowerCase();
  const remoteSearch = mode === 'attendance' || mode === 'web-app-usage' ? query : '';
  const selectedGroup = selectedGroupId ? groups.find((group: any) => Number(group.id) === Number(selectedGroupId)) : null;
  const scopedUserIds = useMemo(() => {
    let ids = users.map((user: any) => Number(user.id));

    if (selectedGroup) {
      const groupUserIds = new Set((selectedGroup.users || []).map((user: any) => Number(user.id)));
      ids = ids.filter((id) => groupUserIds.has(id));
    }

    if (selectedUserId) {
      ids = ids.filter((id) => id === Number(selectedUserId));
    }

    return Array.from(new Set(ids));
  }, [selectedGroup, selectedUserId, users]);

  const dataQuery = useQuery({
    queryKey: ['report-workspace-data', mode, startDate, endDate, remoteSearch, selectedUserId, selectedGroupId],
    enabled: usersQuery.isSuccess && groupsQuery.isSuccess,
    refetchInterval: mode === 'timeline' || mode === 'web-app-usage' || mode === 'productivity' ? 10000 : false,
    refetchIntervalInBackground: mode === 'timeline' || mode === 'web-app-usage' || mode === 'productivity',
    queryFn: async () => {
      if (mode === 'attendance') {
        const response = await reportApi.attendance({
          start_date: startDate,
          end_date: endDate,
          q: remoteSearch || undefined,
        });
        return response.data;
      }

      if (mode === 'hours-tracked' || mode === 'productivity' || mode === 'custom-export') {
        const response = await reportApi.overall({
          start_date: startDate,
          end_date: endDate,
          user_ids: selectedUserId ? [Number(selectedUserId)] : undefined,
          group_ids: selectedGroupId ? [Number(selectedGroupId)] : undefined,
        });
        return response.data;
      }

      if (mode === 'projects-tasks') {
        const [projectsResponse, tasksResponse, timeEntries] = await Promise.all([
          projectApi.getAll(),
          taskApi.getAll(),
          fetchTimeEntriesForUsers(scopedUserIds, startDate, endDate),
        ]);

        return {
          projects: projectsResponse.data || [],
          tasks: tasksResponse.data || [],
          timeEntries,
        };
      }

      if (mode === 'timeline') {
        const response = await activityApi.getAll({
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          group_ids: selectedGroupId ? [Number(selectedGroupId)] : undefined,
          start_date: startDate,
          end_date: endDate,
          page: 1,
          per_page: 200,
        });
        return response.data?.data || [];
      }

      if (mode === 'web-app-usage') {
        const response = await reportApi.employeeInsights({
          start_date: startDate,
          end_date: endDate,
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          group_ids: selectedGroupId ? [Number(selectedGroupId)] : undefined,
          q: remoteSearch || undefined,
        });
        return response.data;
      }

      return null;
    },
  });

  const isLoading = usersQuery.isLoading || groupsQuery.isLoading || dataQuery.isLoading;
  const isError = usersQuery.isError || groupsQuery.isError || dataQuery.isError;
  const pageTitle = modeCopy[mode];

  const attendanceRows = (dataQuery.data as any)?.data || [];
  const attendanceTotals = useMemo(() => {
    if (mode !== 'attendance') return null;
    const presentDays = attendanceRows.reduce((sum: number, row: any) => sum + Number(row.days_present || 0), 0);
    const leaveDays = attendanceRows.reduce((sum: number, row: any) => sum + Number(row.leave_days || 0), 0);
    const workedSeconds = attendanceRows.reduce((sum: number, row: any) => sum + Number(row.worked_seconds || 0), 0);
    return {
      presentDays,
      leaveDays,
      workedSeconds,
      employees: attendanceRows.length,
    };
  }, [attendanceRows, mode]);

  const overallData = dataQuery.data as any;
  const overallSummary = overallData?.summary || {};
  const byUser = overallData?.by_user || [];
  const byDay = overallData?.by_day || [];
  const shouldScrollByUser = byUser.length > 5;
  const shouldScrollByDay = byDay.length > 5;

  const projectsData = dataQuery.data as any;
  const projects = projectsData?.projects || [];
  const tasks = projectsData?.tasks || [];
  const projectTimeEntries = projectsData?.timeEntries || [];
  const hasProjectsTasksScope = selectedUserId !== '' || selectedGroupId !== '';
  const scopedUserIdSet = useMemo(() => new Set(scopedUserIds), [scopedUserIds]);
  const projectsById = useMemo(() => new Map<number, any>(projects.map((project: any) => [Number(project.id), project])), [projects]);
  const tasksById = useMemo(() => new Map<number, any>(tasks.map((task: any) => [Number(task.id), task])), [tasks]);
  const usersById = useMemo(() => new Map<number, any>(users.map((user: any) => [Number(user.id), user])), [users]);
  const filteredTasks = useMemo(() => {
    if (mode !== 'projects-tasks') return [];

    return tasks.filter((task: any) => {
      const project = projectsById.get(Number(task.project_id));
      const assignee = usersById.get(Number(task.assignee_id));
      const matchesScope = !hasProjectsTasksScope || (task.assignee_id ? scopedUserIdSet.has(Number(task.assignee_id)) : false);

      return matchesScope && matchesWorkspaceSearch(projectsTasksSearch, [
        task.title,
        task.description,
        task.status,
        task.priority,
        project?.name,
        assignee?.name,
      ]);
    });
  }, [hasProjectsTasksScope, mode, projectsById, projectsTasksSearch, scopedUserIdSet, tasks, usersById]);
  const filteredProjectTimeEntries = useMemo(() => {
    if (mode !== 'projects-tasks') return [];

    return projectTimeEntries.filter((entry: any) => {
      const projectId = Number(entry.project_id);
      if (!projectId) return false;

      const project = projectsById.get(projectId);
      const task = tasksById.get(Number(entry.task_id));
      const user = usersById.get(Number(entry.user_id));
      const matchesScope = !hasProjectsTasksScope || scopedUserIdSet.has(Number(entry.user_id));

      return matchesScope && matchesWorkspaceSearch(projectsTasksSearch, [
        project?.name,
        project?.description,
        task?.title,
        user?.name,
        entry.description,
      ]);
    });
  }, [hasProjectsTasksScope, mode, projectTimeEntries, projectsById, projectsTasksSearch, scopedUserIdSet, tasksById, usersById]);
  const filteredProjectIds = useMemo(() => new Set([
    ...filteredTasks.map((task: any) => Number(task.project_id)),
    ...filteredProjectTimeEntries.map((entry: any) => Number(entry.project_id)),
  ]), [filteredProjectTimeEntries, filteredTasks]);
  const filteredProjects = useMemo(() => {
    if (mode !== 'projects-tasks') return [];
    if (!hasProjectsTasksScope && !projectsTasksSearch) return projects;

    return projects.filter((project: any) => {
      const projectId = Number(project.id);
      const matchesSearch = matchesWorkspaceSearch(projectsTasksSearch, [project.name, project.description, project.status]);

      if (hasProjectsTasksScope) {
        return filteredProjectIds.has(projectId);
      }

      return filteredProjectIds.has(projectId) || matchesSearch;
    });
  }, [filteredProjectIds, hasProjectsTasksScope, mode, projects, projectsTasksSearch]);

  const projectRows = useMemo(() => {
    if (mode !== 'projects-tasks') return [];
    return filteredProjects.map((project: any) => {
      const projectTasks = filteredTasks.filter((task: any) => Number(task.project_id) === Number(project.id));
      const trackedSeconds = filteredProjectTimeEntries
        .filter((entry: any) => Number(entry.project_id) === Number(project.id))
        .reduce((sum: number, entry: any) => sum + Number(entry.duration || 0), 0);

      return {
        ...project,
        task_count: projectTasks.length,
        open_tasks: projectTasks.filter((task: any) => task.status !== 'done').length,
        tracked_seconds: trackedSeconds,
      };
    });
  }, [filteredProjectTimeEntries, filteredProjects, filteredTasks, mode]);

  const timelineRows = (dataQuery.data as any[]) || [];
  const timelineSummary = useMemo(() => {
    if (mode !== 'timeline') return null;
    return {
      apps: timelineRows.filter((item: any) => item.type === 'app').length,
      urls: timelineRows.filter((item: any) => item.type === 'url').length,
      idle: timelineRows.filter((item: any) => item.type === 'idle').length,
    };
  }, [mode, timelineRows]);

  const usageData = dataQuery.data as any;
  const usageStats = usageData?.stats || {};
  const usageSelectedTools = usageData?.selected_user_tools || { productive: [], unproductive: [], neutral: [] };
  const usageMatchedUsers = usageData?.matched_users || [];
  const orgSummary = usageData?.organization_summary || {};
  const usageOrganizationTools = usageData?.organization_tools || { productive: [], unproductive: [] };
  const employeeRankings = usageData?.employee_rankings?.by_productive_duration || [];
  const hasSelectedEmployee = selectedUserId !== '';
  const usageWorkedDuration = hasSelectedEmployee
    ? Number(usageStats.total_duration || 0)
    : Number(orgSummary.productive_duration || 0) + Number(orgSummary.unproductive_duration || 0) + Number(orgSummary.neutral_duration || 0);
  const usageProductiveRows = hasSelectedEmployee ? usageSelectedTools.productive || [] : usageOrganizationTools.productive || [];
  const usageUnproductiveRows = hasSelectedEmployee ? usageSelectedTools.unproductive || [] : usageOrganizationTools.unproductive || [];

  const handleExport = async () => {
    setExportMessage('');
    setExportError('');
    try {
      const response = await reportApi.export({
        start_date: startDate,
        end_date: endDate,
        user_ids: selectedUserId ? [Number(selectedUserId)] : undefined,
        group_ids: selectedGroupId ? [Number(selectedGroupId)] : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${mode}-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage('Export completed.');
    } catch (error: any) {
      setExportError(error?.response?.data?.message || 'Failed to export report.');
    }
  };

  const renderPanelRefreshButton = () => (
    <Button variant="ghost" size="sm" onClick={() => void dataQuery.refetch()} iconLeft={<RefreshCw className="h-4 w-4" />}>
      Refresh
    </Button>
  );

  if (isLoading) {
    return <PageLoadingState label={`Loading ${pageTitle.title.toLowerCase()}...`} />;
  }

  if (isError) {
    return (
      <PageErrorState
        message={
          (dataQuery.error as any)?.response?.data?.message ||
          (usersQuery.error as any)?.response?.data?.message ||
          (groupsQuery.error as any)?.response?.data?.message ||
          'Failed to load report data.'
        }
        onRetry={() => {
          void usersQuery.refetch();
          void groupsQuery.refetch();
          void dataQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={pageTitle.eyebrow}
        title={pageTitle.title}
        description={pageTitle.description}
        actions={
          <Button onClick={handleExport} variant="secondary">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {exportMessage ? <FeedbackBanner tone="success" message={exportMessage} /> : null}
      {exportError ? <FeedbackBanner tone="error" message={exportError} /> : null}

      <FilterPanel className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === 'attendance' || mode === 'web-app-usage' ? 'Name or email' : 'Optional filter'}
          />
        </div>
        <div>
          <FieldLabel>Employee</FieldLabel>
          <SelectInput value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">All employees</option>
            {users.map((employee: any) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Team</FieldLabel>
          <SelectInput value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">All groups</option>
            {groups.map((group: any) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </FilterPanel>

      {mode === 'attendance' && attendanceTotals ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Employees" value={attendanceTotals.employees} hint="Employees in range" icon={Users} accent="sky" />
            <MetricCard label="Present Days" value={attendanceTotals.presentDays} hint="Total present days" icon={CalendarDays} accent="emerald" />
            <MetricCard label="Leave Days" value={attendanceTotals.leaveDays} hint="Approved leave in range" icon={ListFilter} accent="amber" />
            <MetricCard label="Worked Time" value={formatDuration(attendanceTotals.workedSeconds)} hint="Tracked attendance time" icon={TimerReset} accent="violet" />
          </div>

          <DataTable
            title="Attendance Breakdown"
            description="Presence, leave, attendance rate, and current work state per employee."
            rows={attendanceRows}
            emptyMessage="No attendance rows found for the selected range."
            headerAction={renderPanelRefreshButton()}
            columns={[
              { key: 'employee', header: 'Employee', render: (row: any) => <div><p className="font-medium text-slate-950">{row.user?.name}</p><p className="text-xs text-slate-500">{row.user?.email}</p></div> },
              { key: 'present', header: 'Present', render: (row: any) => `${row.days_present} / ${row.working_days_in_range}` },
              { key: 'leave', header: 'Leave', render: (row: any) => row.leave_days },
              { key: 'attendance_rate', header: 'Attendance %', render: (row: any) => `${row.attendance_rate}%` },
              { key: 'worked', header: 'Worked', render: (row: any) => formatDuration(row.worked_seconds) },
              { key: 'status', header: 'Status', render: (row: any) => (row.is_working ? 'Working' : 'Offline') },
            ]}
          />
        </>
      ) : null}

      {(mode === 'hours-tracked' || mode === 'productivity' || mode === 'custom-export') && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tracked Time" value={formatDuration(overallSummary.total_duration || 0)} hint="Total duration in range" icon={TimerReset} accent="sky" />
            <MetricCard label="Working Time" value={formatDuration(getWorkingDuration(overallSummary))} hint="Tracked time minus measured idle time" icon={LineChart} accent="emerald" />
            <MetricCard label="Idle Time" value={formatDuration(overallSummary.idle_duration || 0)} hint="Measured idle time inside tracked time" icon={Activity} accent="amber" />
            <MetricCard label="Active Users" value={overallSummary.active_users || 0} hint={`${overallSummary.users_count || 0} users tracked`} icon={Users} accent="violet" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable
              title={mode === 'productivity' ? 'Employee Productivity' : 'Employee Hours'}
              description="Per-user totals, idle share, and latest activity."
              rows={byUser}
              emptyMessage="No employee rows found."
              headerAction={renderPanelRefreshButton()}
              bodyClassName={shouldScrollByUser ? 'max-h-[360px] overflow-y-auto' : undefined}
              columns={[
                { key: 'user', header: 'User', render: (row: any) => <div><p className="font-medium text-slate-950">{row.user?.name}</p><p className="text-xs text-slate-500">{row.user?.email}</p></div> },
                { key: 'total', header: 'Tracked', render: (row: any) => formatDuration(row.total_duration || 0) },
                { key: 'working', header: 'Working', render: (row: any) => formatDuration(getWorkingDuration(row)) },
                { key: 'idle', header: 'Idle', render: (row: any) => formatDuration(row.idle_duration || 0) },
                { key: 'idle_pct', header: 'Idle %', render: (row: any) => `${Number(row.idle_percentage || 0).toFixed(1)}%` },
              ]}
            />
            <SurfaceCard className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Daily Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">Daily totals within the selected range.</p>
                </div>
                {renderPanelRefreshButton()}
              </div>
              {byDay.length === 0 ? (
                <div className="mt-6">
                  <PageEmptyState title="No trend data" description="Tracked work by day will appear here." />
                </div>
              ) : (
                <div className={`mt-5 space-y-3 ${shouldScrollByDay ? 'max-h-[360px] overflow-y-auto pr-2' : ''}`.trim()}>
                  {byDay.map((item: any) => {
                    const width = Math.max(
                      8,
                      Math.round((Number(item.total_duration || 0) / Math.max(1, ...byDay.map((entry: any) => Number(entry.total_duration || 0)))) * 100)
                    );
                    return (
                      <div key={item.date} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{item.date}</span>
                          <span className="font-medium text-slate-950">{formatDuration(item.total_duration || 0)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>
          </div>
        </>
      )}

      {mode === 'projects-tasks' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Projects" value={filteredProjects.length} hint="Projects in scope" icon={FolderKanban} accent="sky" />
            <MetricCard label="Tasks" value={filteredTasks.length} hint="Tasks in scope" icon={ListFilter} accent="violet" />
            <MetricCard label="Open Tasks" value={filteredTasks.filter((task: any) => task.status !== 'done').length} hint="Todo and in-progress tasks" icon={Waypoints} accent="amber" />
            <MetricCard label="Tracked Time" value={formatDuration(filteredProjectTimeEntries.reduce((sum: number, entry: any) => sum + Number(entry.duration || 0), 0))} hint="Project-linked time in scope" icon={TimerReset} accent="emerald" />
          </div>

          <DataTable
            title="Project Overview"
            description="Tracked duration, task volume, and current status by project."
            rows={projectRows}
            emptyMessage="No project data found."
            headerAction={renderPanelRefreshButton()}
            columns={[
              { key: 'project', header: 'Project', render: (row: any) => <div><p className="font-medium text-slate-950">{row.name}</p><p className="text-xs text-slate-500">{row.description || 'No description'}</p></div> },
              { key: 'status', header: 'Status', render: (row: any) => row.status },
              { key: 'tasks', header: 'Tasks', render: (row: any) => row.task_count },
              { key: 'open_tasks', header: 'Open', render: (row: any) => row.open_tasks },
              { key: 'tracked', header: 'Tracked', render: (row: any) => formatDuration(row.tracked_seconds || 0) },
            ]}
          />

          <DataTable
            title="Task Allocation"
            description="Task status and priority mapped to projects."
            rows={filteredTasks}
            emptyMessage="No tasks found."
            headerAction={renderPanelRefreshButton()}
            columns={[
              { key: 'title', header: 'Task', render: (row: any) => <div><p className="font-medium text-slate-950">{row.title}</p><p className="text-xs text-slate-500">{row.project?.name || 'No project'}</p></div> },
              { key: 'status', header: 'Status', render: (row: any) => row.status },
              { key: 'priority', header: 'Priority', render: (row: any) => row.priority },
              { key: 'assignee', header: 'Assignee', render: (row: any) => row.assignee?.name || 'Unassigned' },
              { key: 'due', header: 'Due Date', render: (row: any) => row.due_date ? row.due_date.split('T')[0] : 'No due date' },
            ]}
          />
        </>
      )}

      {mode === 'timeline' && timelineSummary && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Events" value={timelineRows.length} hint="All timeline events" icon={Waypoints} accent="sky" />
            <MetricCard label="Apps" value={timelineSummary.apps} hint="Desktop/app events" icon={Activity} accent="emerald" />
            <MetricCard label="Web" value={timelineSummary.urls} hint="Website events" icon={LineChart} accent="violet" />
            <MetricCard label="Idle" value={timelineSummary.idle} hint="Idle periods" icon={TimerReset} accent="amber" />
          </div>

          <DataTable
            title="Activity Timeline"
            description="Recent app, website, and idle events in chronological order."
            rows={timelineRows.slice().sort((a: any, b: any) => +new Date(b.recorded_at) - +new Date(a.recorded_at))}
            emptyMessage="No timeline events found."
            headerAction={renderPanelRefreshButton()}
            bodyClassName={timelineRows.length > 8 ? 'max-h-[420px] overflow-y-auto' : undefined}
            columns={[
              { key: 'recorded_at', header: 'When', render: (row: any) => new Date(row.recorded_at).toLocaleString() },
              { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
              { key: 'type', header: 'Type', render: (row: any) => row.type },
              { key: 'name', header: 'Name', render: (row: any) => row.name },
              { key: 'duration', header: 'Duration', render: (row: any) => formatTimelineDuration(row.duration || 0) },
            ]}
          />
        </>
      )}

      {mode === 'web-app-usage' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={hasSelectedEmployee ? 'Selected Employee' : 'Scope'}
              value={hasSelectedEmployee ? usageData?.selected_user?.name || 'Selected employee' : 'All employees'}
              hint={hasSelectedEmployee ? usageData?.selected_user?.email || 'Using selected employee filter' : selectedGroupId ? 'Team filter selected' : 'Organization-wide view'}
              icon={Users}
              accent="sky"
            />
            <MetricCard label="Worked" value={formatDuration(usageWorkedDuration)} hint={hasSelectedEmployee ? 'Tracked duration' : 'Tracked duration across current scope'} icon={TimerReset} accent="emerald" />
            <MetricCard label="Productive Share" value={`${Number(orgSummary.productive_share || 0).toFixed(1)}%`} hint="Organization average" icon={LineChart} accent="violet" />
            <MetricCard
              label={hasSelectedEmployee ? 'Idle' : 'Employees'}
              value={hasSelectedEmployee ? formatDuration(usageStats.idle_total_duration || 0) : employeeRankings.length}
              hint={hasSelectedEmployee ? 'Selected employee idle time' : 'Employees in current monitoring dataset'}
              icon={Activity}
              accent="amber"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable
              title={hasSelectedEmployee ? 'Productive Tools' : 'Top Productive Tools'}
              description={hasSelectedEmployee ? 'Top productive websites and apps for the selected employee.' : 'Top productive websites and apps across the current scope.'}
              rows={usageProductiveRows}
              emptyMessage="No productive tool usage found."
              headerAction={renderPanelRefreshButton()}
              bodyClassName={usageProductiveRows.length > 5 ? 'max-h-[320px] overflow-y-auto' : undefined}
              columns={[
                { key: 'label', header: 'Tool', render: (row: any) => row.label },
                { key: 'type', header: 'Type', render: (row: any) => row.type },
                { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.total_duration || 0) },
              ]}
            />
            <DataTable
              title={hasSelectedEmployee ? 'Unproductive Tools' : 'Top Unproductive Tools'}
              description={hasSelectedEmployee ? 'Top unproductive websites and apps for the selected employee.' : 'Top unproductive websites and apps across the current scope.'}
              rows={usageUnproductiveRows}
              emptyMessage="No unproductive tool usage found."
              headerAction={renderPanelRefreshButton()}
              bodyClassName={usageUnproductiveRows.length > 5 ? 'max-h-[320px] overflow-y-auto' : undefined}
              columns={[
                { key: 'label', header: 'Tool', render: (row: any) => row.label },
                { key: 'type', header: 'Type', render: (row: any) => row.type },
                { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.total_duration || 0) },
              ]}
            />
          </div>

          <DataTable
            title="Top Productive Employees"
            description={hasSelectedEmployee ? 'Employee ranking by productive duration from the current monitoring dataset.' : 'Employee ranking by productive duration across the current monitoring dataset.'}
            rows={employeeRankings}
            emptyMessage="No employee ranking data found."
            headerAction={renderPanelRefreshButton()}
            bodyClassName={employeeRankings.length > 5 ? 'max-h-[320px] overflow-y-auto' : undefined}
            columns={[
              { key: 'employee', header: 'Employee', render: (row: any) => row.user?.name || 'Unknown' },
              { key: 'productive_duration', header: 'Productive Time', render: (row: any) => formatDuration(row.productive_duration || 0) },
              { key: 'worked', header: 'Worked', render: (row: any) => formatDuration(row.total_duration || 0) },
              { key: 'matched_users', header: 'Search Pool', render: () => usageMatchedUsers.length },
            ]}
          />
        </>
      )}

      {mode === 'custom-export' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Export Scope</h2>
                <p className="mt-1 text-sm text-slate-500">Use the current filters to export the same report range used across dashboards.</p>
              </div>
              {renderPanelRefreshButton()}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date Range</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{startDate} to {endDate}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Filters</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {selectedUserId ? 'Single employee' : selectedGroupId ? 'Single group' : 'Organization-wide'}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Button onClick={handleExport}>
                <Download className="h-4 w-4" />
                Download Current Export
              </Button>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Data Preview</h2>
                <p className="mt-1 text-sm text-slate-500">Current totals from the selected export scope.</p>
              </div>
              {renderPanelRefreshButton()}
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tracked time</span>
                <span className="font-medium text-slate-950">{formatDuration(overallSummary.total_duration || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Working time</span>
                <span className="font-medium text-slate-950">{formatDuration(getWorkingDuration(overallSummary))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Idle time</span>
                <span className="font-medium text-slate-950">{formatDuration(overallSummary.idle_duration || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Active users</span>
                <span className="font-medium text-slate-950">{overallSummary.active_users || 0}</span>
              </div>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {mode !== 'custom-export' &&
      mode !== 'attendance' &&
      mode !== 'hours-tracked' &&
      mode !== 'projects-tasks' &&
      mode !== 'timeline' &&
      mode !== 'web-app-usage' &&
      mode !== 'productivity' ? (
        <PageEmptyState title="No report mode selected" description="Choose another report from the top navigation." />
      ) : null}
    </div>
  );
}
