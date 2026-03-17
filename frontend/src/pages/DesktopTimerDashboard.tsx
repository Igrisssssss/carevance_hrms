import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, attendanceTimeEditApi, timeEntryApi, dashboardApi, projectApi } from '@/services/api';
import PageHeader from '@/components/dashboard/PageHeader';
import MetricCard from '@/components/dashboard/MetricCard';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import Button from '@/components/ui/Button';
import { PageLoadingState } from '@/components/ui/PageState';
import { SelectInput } from '@/components/ui/FormField';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Clock,
  Play,
  Pause,
  TrendingUp,
  Users,
  FolderKanban,
  Calendar,
} from 'lucide-react';
import type { TimeEntry } from '@/types';
import type { Project, Task } from '@/types';

const ACTIVE_TIMER_KEY = 'active_timer_snapshot';
const AUTO_START_SUPPRESSED_KEY = 'desktop_timer_auto_start_suppressed';

const getAutoStartSuppressionKey = (userId?: number | null) => `${AUTO_START_SUPPRESSED_KEY}:${userId ?? 'guest'}`;

const suppressAutoStart = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.setItem(getAutoStartSuppressionKey(userId), '1');
};

const clearAutoStartSuppression = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.removeItem(getAutoStartSuppressionKey(userId));
};

const isAutoStartSuppressed = (userId?: number | null) => {
  if (!userId) return false;
  return sessionStorage.getItem(getAutoStartSuppressionKey(userId)) === '1';
};

const getStartTimeMs = (startTime?: string) => {
  if (!startTime) return NaN;
  const parsed = new Date(startTime).getTime();
  if (Number.isFinite(parsed)) return parsed;
  const normalized = startTime.includes('T') ? startTime : startTime.replace(' ', 'T');
  return new Date(normalized).getTime();
};

export default function DesktopTimerDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [newMembersThisWeek, setNewMembersThisWeek] = useState(0);
  const [productivityScore, setProductivityScore] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [todayDeltaLabel, setTodayDeltaLabel] = useState('No change from yesterday');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [attendanceToday, setAttendanceToday] = useState<any | null>(null);
  const [shiftTargetSeconds, setShiftTargetSeconds] = useState(8 * 3600);
  const [workedBaseSeconds, setWorkedBaseSeconds] = useState(0);
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(0);
  const [isSubmittingOvertime, setIsSubmittingOvertime] = useState(false);
  const [isLoadingProjectTasks, setIsLoadingProjectTasks] = useState(false);
  const [isUpdatingTimerContext, setIsUpdatingTimerContext] = useState(false);
  const [notice, setNotice] = useState('');
  const hasRestoredSnapshotRef = useRef(false);
  const hasAttemptedAutoStartRef = useRef(false);

  useEffect(() => {
    if (!activeTimer) {
      setLiveDuration(0);
      localStorage.removeItem(ACTIVE_TIMER_KEY);
      return;
    }

    localStorage.setItem(
      ACTIVE_TIMER_KEY,
      JSON.stringify({
        id: activeTimer.id,
        start_time: activeTimer.start_time,
        duration: activeTimer.duration ?? 0,
        description: activeTimer.description ?? '',
      })
    );

    const computeDuration = () => {
      const base = Number.isFinite(Number(activeTimer.duration)) ? Number(activeTimer.duration) : 0;
      const startMs = getStartTimeMs(activeTimer.start_time);
      if (!Number.isFinite(startMs)) {
        return base;
      }

      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      return Math.max(base, elapsed, 0);
    };

    setLiveDuration(computeDuration());

    const interval = setInterval(() => {
      setLiveDuration(computeDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.id, activeTimer?.duration, activeTimer?.start_time]);

  const syncTimerEntryLocally = (entry: TimeEntry | null) => {
    setActiveTimer(entry);
    if (!entry) {
      return;
    }

    setTodayEntries((prev) => {
      const nextEntries = prev.some((current) => current.id === entry.id)
        ? prev.map((current) => (current.id === entry.id ? { ...current, ...entry } : current))
        : [entry, ...prev];

      return nextEntries;
    });
  };

  const loadProjectTasks = async (projectId: number | null) => {
    if (!projectId) {
      setProjectTasks([]);
      return;
    }

    setIsLoadingProjectTasks(true);
    try {
      const response = await projectApi.getTasks(projectId);
      const nextTasks = (response.data || []).filter((task) => task.status !== 'done');
      setProjectTasks(nextTasks);
    } catch (error) {
      console.error('Error loading project tasks:', error);
      setProjectTasks([]);
    } finally {
      setIsLoadingProjectTasks(false);
    }
  };

  const fetchData = async () => {
    try {
      const [dashboardResponse, projectsResponse, attendanceResponse] = await Promise.all([
        dashboardApi.summary(),
        projectApi.getAll(),
        attendanceApi.today(),
      ]);
      const data = dashboardResponse.data as any;
      const fetchedProjects = projectsResponse.data || [];
      const attendancePayload = attendanceResponse.data as any;

      const activeFromApi = data?.active_timer || null;
      const snapshot = activeFromApi ? null : localStorage.getItem(ACTIVE_TIMER_KEY);
      setActiveTimer(activeFromApi);
      if (!activeFromApi) {
        localStorage.removeItem(ACTIVE_TIMER_KEY);
      } else {
        clearAutoStartSuppression(userId);
        hasRestoredSnapshotRef.current = false;
      }
      setTodayEntries(data?.today_entries || []);
      setTodayTotal(Number(data?.today_total_elapsed_duration ?? data?.today_total_duration ?? 0) || 0);
      setAllTimeTotal(Number(data?.all_time_total_elapsed_duration ?? data?.all_time_total_duration ?? 0) || 0);
      setProjects(fetchedProjects);
      setSelectedProjectId((current) => activeFromApi?.project_id || current || fetchedProjects[0]?.id || null);
      setSelectedTaskId(activeFromApi?.task_id || null);
      setTeamMembersCount(Number(data?.team_members_count) || 0);
      setNewMembersThisWeek(Number(data?.new_members_this_week) || 0);
      setProductivityScore(Number(data?.productivity_score) || 0);
      setActiveProjectsCount(Number(data?.active_projects_count) || 0);
      setTotalProjectsCount(Number(data?.total_projects_count) || 0);

      const pct = data?.today_change_percent;
      if (typeof pct === 'number') {
        setTodayDeltaLabel(`${pct >= 0 ? '+' : ''}${pct}% from yesterday`);
      } else {
        const elapsed = Number(data?.today_total_elapsed_duration ?? data?.today_total_duration ?? 0) || 0;
        setTodayDeltaLabel(elapsed > 0 ? 'Started today' : 'No change from yesterday');
      }

      const attendanceRecord = attendancePayload?.record || null;
      setAttendanceToday(attendanceRecord);
      setShiftTargetSeconds(Number(attendancePayload?.shift_target_seconds || attendanceRecord?.shift_target_seconds || 8 * 3600));
      setWorkedBaseSeconds(Number(attendanceRecord?.worked_seconds || 0));
      setTimerBaseSeconds(Number(activeFromApi?.duration || 0));

      if (!activeFromApi) {
        if (snapshot && !hasRestoredSnapshotRef.current) {
          hasRestoredSnapshotRef.current = true;
          setNotice(attendanceRecord?.is_checked_in
            ? 'Your previous running timer was not found and was cleared. Start it again if needed.'
            : 'A stale timer snapshot was cleared.');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hasAttemptedAutoStartRef.current = false;
    hasRestoredSnapshotRef.current = false;
    setNotice('');
    setActiveTimer(null);
    setTodayEntries([]);
    setTodayTotal(0);
    setAllTimeTotal(0);
    setProjects([]);
    setProjectTasks([]);
    setSelectedProjectId(null);
    setSelectedTaskId(null);

    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchData();
  }, [userId]);

  useEffect(() => {
    void loadProjectTasks(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!activeTimer) {
      if (selectedTaskId && !projectTasks.some((task) => task.id === selectedTaskId)) {
        setSelectedTaskId(null);
      }
      return;
    }

    if (activeTimer.project_id) {
      setSelectedProjectId(activeTimer.project_id);
    }
    setSelectedTaskId(activeTimer.task_id || null);
  }, [activeTimer?.id, activeTimer?.project_id, activeTimer?.task_id, projectTasks, selectedTaskId]);

  useEffect(() => {
    if (isLoading || user?.role !== 'employee') {
      return;
    }

    if (activeTimer) {
      hasAttemptedAutoStartRef.current = true;
      return;
    }

    if (hasAttemptedAutoStartRef.current || isStarting || isAutoStartSuppressed(userId)) {
      return;
    }

    hasAttemptedAutoStartRef.current = true;
    void handleStartTimer(true);
  }, [activeTimer?.id, isLoading, isStarting, user?.role, userId]);

  const handleStartTimer = async (isAutoStart = false) => {
    setIsStarting(true);
    setNotice(isAutoStart ? 'Starting your timer automatically...' : '');
    try {
      const startedAtIso = new Date().toISOString();
      const response = await timeEntryApi.start({
        project_id: isAutoStart ? null : selectedProjectId,
        task_id: isAutoStart ? null : selectedTaskId,
        timer_slot: 'primary',
      });
      clearAutoStartSuppression(userId);
      syncTimerEntryLocally(response.data);
      setAttendanceToday((prev: any) => ({
        ...(prev || {}),
        attendance_date: prev?.attendance_date || startedAtIso.split('T')[0],
        is_checked_in: true,
        check_in_at: prev?.check_in_at || startedAtIso,
      }));
      localStorage.setItem(
        ACTIVE_TIMER_KEY,
        JSON.stringify({
          id: response.data.id,
          start_time: response.data.start_time,
          duration: response.data.duration ?? 0,
          description: response.data.description ?? '',
        })
      );
      setNotice(isAutoStart ? 'Timer started. Choose a project, then a task for the running session.' : '');
      await fetchData();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      setNotice(error?.response?.data?.message || (isAutoStart ? 'Could not auto-start the timer.' : 'Failed to start timer'));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTimer = async () => {
    try {
      setNotice('');
      const response = await timeEntryApi.stop({ timer_slot: (activeTimer?.timer_slot || 'primary') as 'primary' | 'secondary' });
      const stoppedEntry = response.data;
      suppressAutoStart(userId);
      setActiveTimer(null);
      localStorage.removeItem(ACTIVE_TIMER_KEY);

      if (stoppedEntry) {
        setTodayEntries((prev) => {
          const withoutCurrent = prev.filter((entry) => entry.id !== stoppedEntry.id);
          const nextEntries = [stoppedEntry, ...withoutCurrent];
          const nextTotal = nextEntries.reduce((sum, entry) => {
            const duration = Number.isFinite(Number(entry.duration)) ? Number(entry.duration) : 0;
            return sum + duration;
          }, 0);
          setTodayTotal(nextTotal);
          return nextEntries;
        });
      } else {
        const todayResponse = await timeEntryApi.today();
        setTodayEntries(todayResponse.data.time_entries);
        setTodayTotal(todayResponse.data.total_duration);
      }
      await fetchData();
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        suppressAutoStart(userId);
        setActiveTimer(null);
        localStorage.removeItem(ACTIVE_TIMER_KEY);
        await fetchData();
        return;
      }
      console.error('Error stopping timer:', error);
    }
  };

  const handleProjectSelection = async (projectId: number | null) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);

    if (!activeTimer) {
      return;
    }

    setIsUpdatingTimerContext(true);
    setNotice('');

    try {
      const response = await timeEntryApi.update(activeTimer.id, {
        project_id: projectId,
        task_id: null,
      });
      syncTimerEntryLocally(response.data);
      setNotice(projectId ? 'Project updated for the running timer. Choose a task next.' : 'Project cleared from the running timer.');
    } catch (error: any) {
      console.error('Error updating timer project:', error);
      setSelectedProjectId(activeTimer.project_id || null);
      setSelectedTaskId(activeTimer.task_id || null);
      setNotice(error?.response?.data?.message || 'Failed to update the running timer project.');
    } finally {
      setIsUpdatingTimerContext(false);
    }
  };

  const handleTaskSelection = async (taskId: number | null) => {
    setSelectedTaskId(taskId);

    if (!activeTimer) {
      return;
    }

    setIsUpdatingTimerContext(true);
    setNotice('');

    try {
      const response = await timeEntryApi.update(activeTimer.id, {
        project_id: selectedProjectId,
        task_id: taskId,
      });
      syncTimerEntryLocally(response.data);
      setNotice(taskId ? 'Task updated for the running timer.' : 'Task cleared from the running timer.');
    } catch (error: any) {
      console.error('Error updating timer task:', error);
      setSelectedTaskId(activeTimer.task_id || null);
      setNotice(error?.response?.data?.message || 'Failed to update the running timer task.');
    } finally {
      setIsUpdatingTimerContext(false);
    }
  };

  const currentWorkedSeconds = Math.max(
    0,
    workedBaseSeconds + (activeTimer ? Math.max(0, liveDuration - timerBaseSeconds) : 0)
  );
  const remainingShiftSeconds = Math.max(0, shiftTargetSeconds - currentWorkedSeconds);
  const overtimeSeconds = Math.max(0, currentWorkedSeconds - shiftTargetSeconds);
  const availableTasks = projectTasks.filter((task) => task.status !== 'done');

  const submitOvertimeProof = async () => {
    if (overtimeSeconds <= 0) {
      setNotice('Overtime has not started yet.');
      return;
    }

    setIsSubmittingOvertime(true);
    setNotice('');
    try {
      const todayDate = attendanceToday?.attendance_date || new Date().toISOString().split('T')[0];
      await attendanceTimeEditApi.create({
        attendance_date: todayDate,
        extra_minutes: Math.ceil(overtimeSeconds / 60),
        worked_seconds: currentWorkedSeconds,
        overtime_seconds: overtimeSeconds,
        message: `Auto overtime proof from dashboard timer. Overtime: ${formatDuration(overtimeSeconds)}.`,
      });
      setNotice(`Overtime proof sent to admin. Worked: ${formatDuration(currentWorkedSeconds)}, Overtime: ${formatDuration(overtimeSeconds)}.`);
    } catch (error: any) {
      setNotice(error?.response?.data?.message || 'Failed to submit overtime proof.');
    } finally {
      setIsSubmittingOvertime(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <PageLoadingState label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Workspace overview"
        title={`Welcome back, ${user?.name?.split(' ')[0]}!`}
        description="Start the timer, review today's attendance progress, and keep your current activity in one place."
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <Calendar className="h-4 w-4 text-sky-700" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        }
      />

      <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_28%,#0369a1_76%,#22d3ee_100%)] p-6 text-white shadow-[0_38px_100px_-48px_rgba(2,6,23,0.92)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-cyan-100/80">
              {activeTimer ? 'Timer Running' : 'Desktop timer'}
            </p>
            <div className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {activeTimer ? formatTime(liveDuration) : '00:00:00'}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3">
                <p className="text-xs text-cyan-100/70">Shift Remaining</p>
                <p className="font-semibold">{formatTime(remainingShiftSeconds)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3">
                <p className="text-xs text-cyan-100/70">Overtime Timer</p>
                <p className="font-semibold">{formatTime(overtimeSeconds)}</p>
              </div>
            </div>
            {activeTimer?.description && (
              <p className="mt-3 text-sm text-cyan-50/90">{activeTimer.description}</p>
            )}
            {activeTimer?.project?.name && (
              <p className="mt-1 text-sm text-cyan-50/90">Project: {activeTimer.project.name}</p>
            )}
            {activeTimer?.task?.title && (
              <p className="mt-1 text-sm text-cyan-50/90">Task: {activeTimer.task.title}</p>
            )}
            {activeTimer && !activeTimer?.project?.name ? (
              <p className="mt-3 text-sm text-cyan-50/90">Choose a project first, then pick one of that project's tasks for this running timer.</p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <StatusBadge tone={activeTimer ? 'success' : 'info'} className="border-white/15 bg-white/10 text-white">
              {isUpdatingTimerContext ? 'Updating timer' : activeTimer ? 'Live session' : 'Ready to start'}
            </StatusBadge>
            <Button
              onClick={() => (activeTimer ? handleStopTimer() : handleStartTimer())}
              aria-label={activeTimer ? 'Pause timer' : 'Start timer'}
              disabled={isStarting || isUpdatingTimerContext}
              variant="secondary"
              size="lg"
              className={`h-16 w-16 rounded-full border-0 px-0 ${
                activeTimer ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-primary-700 hover:bg-sky-50'
              }`}
            >
              {activeTimer ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-white/15 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">
              {activeTimer ? 'Running Timer Project' : 'Project'}
            </p>
            <SelectInput
              aria-label="Active timer project"
              value={selectedProjectId ?? ''}
              onChange={(e) => void handleProjectSelection(e.target.value ? Number(e.target.value) : null)}
              disabled={isStarting || isUpdatingTimerContext}
              className="mt-3 border-white/35 bg-white/90 text-slate-950 shadow-none focus:border-white focus:bg-white focus:ring-white/30 disabled:bg-white/60 disabled:text-slate-500"
            >
              <option value="" className="text-gray-900">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="text-gray-900">
                  {project.name}
                </option>
              ))}
            </SelectInput>
            <p className="mt-2 text-xs text-cyan-100/75">
              {activeTimer ? 'Changing the project clears the current task so you can pick a matching one.' : 'The running timer will use this project once started.'}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/15 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Running Timer Task</p>
            <SelectInput
              aria-label="Active timer task"
              value={selectedTaskId ?? ''}
              onChange={(e) => void handleTaskSelection(e.target.value ? Number(e.target.value) : null)}
              disabled={!activeTimer || !selectedProjectId || isLoadingProjectTasks || isUpdatingTimerContext}
              className="mt-3 border-white/35 bg-white/90 text-slate-950 shadow-none focus:border-white focus:bg-white focus:ring-white/30 disabled:bg-white/60 disabled:text-slate-500"
            >
              <option value="" className="text-gray-900">
                {!selectedProjectId
                  ? 'Choose project first'
                  : isLoadingProjectTasks
                    ? 'Loading tasks...'
                    : availableTasks.length === 0
                      ? 'No open tasks available'
                      : 'Choose task'}
              </option>
              {availableTasks.map((task) => (
                <option key={task.id} value={task.id} className="text-gray-900">
                  {task.title}
                </option>
              ))}
            </SelectInput>
            <p className="mt-2 text-xs text-cyan-100/75">
              {activeTimer ? 'Only tasks from the selected project are listed here for the live timer.' : 'Task selection becomes active while the timer is running.'}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-cyan-50/85">
          Total elapsed (all sessions): {formatDuration(allTimeTotal)} | Today's attendance worked: {formatDuration(currentWorkedSeconds)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            onClick={submitOvertimeProof}
            disabled={isSubmittingOvertime || overtimeSeconds <= 0}
            variant="secondary"
            size="sm"
            className="bg-white text-primary-700 hover:bg-sky-50"
          >
            {isSubmittingOvertime ? 'Sending...' : 'Send Overtime Proof to Admin'}
          </Button>
          {notice ? <span className="text-xs text-cyan-50">{notice}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's Time" value={formatDuration(todayTotal)} hint={todayDeltaLabel} icon={Clock} accent="sky" />
        <MetricCard label="Active Projects" value={activeProjectsCount} hint={`${totalProjectsCount} total projects`} icon={FolderKanban} accent="violet" />
        <MetricCard label="Team Members" value={teamMembersCount} hint={`${newMembersThisWeek} new this week`} icon={Users} accent="emerald" />
        <MetricCard label="Productivity" value={`${productivityScore}%`} hint="Based on working ratio this week" icon={TrendingUp} accent="amber" />
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-slate-200/80 p-5">
          <h2 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Today's Time Entries</h2>
        </div>
        <div className="divide-y divide-slate-200/80">
          {todayEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Clock className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p>No time entries yet today</p>
              <p className="text-sm">Start tracking to see your entries here</p>
            </div>
          ) : (
            todayEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50/80">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{entry.project?.name || 'No Project'}</p>
                    <p className="truncate text-sm text-slate-500">{entry.description || 'No description'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-950">{formatDuration(entry.duration)}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(entry.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
