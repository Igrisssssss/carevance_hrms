import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { timeEntryApi, dashboardApi, projectApi } from '@/services/api';
import { 
  Clock, 
  Play, 
  Pause, 
  TrendingUp, 
  Users, 
  FolderKanban,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import type { TimeEntry } from '@/types';
import type { Project } from '@/types';

const ACTIVE_TIMER_KEY = 'active_timer_snapshot';

const getStartTimeMs = (startTime?: string) => {
  if (!startTime) return NaN;
  const parsed = new Date(startTime).getTime();
  if (Number.isFinite(parsed)) return parsed;
  const normalized = startTime.includes('T') ? startTime : startTime.replace(' ', 'T');
  return new Date(normalized).getTime();
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [newMembersThisWeek, setNewMembersThisWeek] = useState(0);
  const [productivityScore, setProductivityScore] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [todayDeltaLabel, setTodayDeltaLabel] = useState('No change from yesterday');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchData = async () => {
    try {
      const [dashboardResponse, projectsResponse] = await Promise.all([
        dashboardApi.summary(),
        projectApi.getAll(),
      ]);
      const data = dashboardResponse.data as any;
      const fetchedProjects = projectsResponse.data || [];

      const activeFromApi = data?.active_timer || null;
      setActiveTimer(activeFromApi);
      if (!activeFromApi) {
        localStorage.removeItem(ACTIVE_TIMER_KEY);
      }
      setTodayEntries(data?.today_entries || []);
      setTodayTotal(Number(data?.today_total_elapsed_duration ?? data?.today_total_duration ?? 0) || 0);
      setAllTimeTotal(Number(data?.all_time_total_elapsed_duration ?? data?.all_time_total_duration ?? 0) || 0);
      setProjects(fetchedProjects);
      if (!selectedProjectId && fetchedProjects.length > 0) {
        setSelectedProjectId(fetchedProjects[0].id);
      }
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedProjectId) {
      return;
    }

    setIsStarting(true);
    try {
      const response = await timeEntryApi.start({ project_id: selectedProjectId, timer_slot: 'primary' });
      setActiveTimer(response.data);
      localStorage.setItem(
        ACTIVE_TIMER_KEY,
        JSON.stringify({
          id: response.data.id,
          start_time: response.data.start_time,
          duration: response.data.duration ?? 0,
          description: response.data.description ?? '',
        })
      );
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTimer = async () => {
    try {
      const response = await timeEntryApi.stop({ timer_slot: (activeTimer?.timer_slot || 'primary') as 'primary' | 'secondary' });
      const stoppedEntry = response.data;
      setActiveTimer(null);
      localStorage.removeItem(ACTIVE_TIMER_KEY);

      if (stoppedEntry) {
        setTodayEntries((prev) => {
          const withoutCurrent = prev.filter((entry) => entry.id !== stoppedEntry.id);
          const nextEntries = [stoppedEntry, ...withoutCurrent];
          const nextTotal = nextEntries.reduce((sum, entry) => {
            const d = Number.isFinite(Number(entry.duration)) ? Number(entry.duration) : 0;
            return sum + d;
          }, 0);
          setTodayTotal(nextTotal);
          return nextEntries;
        });
      } else {
        const todayResponse = await timeEntryApi.today();
        setTodayEntries(todayResponse.data.time_entries);
        setTodayTotal(todayResponse.data.total_duration);
      }
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setActiveTimer(null);
        localStorage.removeItem(ACTIVE_TIMER_KEY);
        await fetchData();
        return;
      }
      console.error('Error stopping timer:', error);
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening today</p>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Timer Card */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">
              {activeTimer ? 'Timer Running' : 'Start Tracking'}
            </p>
            <div className="text-5xl font-bold tracking-tight">
              {activeTimer ? formatTime(liveDuration) : '00:00:00'}
            </div>
            {activeTimer?.description && (
              <p className="text-primary-100 mt-2">{activeTimer.description}</p>
            )}
            {activeTimer?.project?.name && (
              <p className="text-primary-100 mt-1">Project: {activeTimer.project.name}</p>
            )}
          </div>
          <button
            onClick={activeTimer ? handleStopTimer : handleStartTimer}
            disabled={isStarting || (!activeTimer && !selectedProjectId)}
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
              activeTimer 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-white text-primary-600 hover:bg-primary-50'
            }`}
          >
            {activeTimer ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </button>
        </div>
        {!activeTimer && (
          <div className="mt-4 max-w-xs">
            <label className="block text-xs text-primary-100 mb-1">Select Project</label>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-white/30 bg-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="" className="text-gray-900">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="text-gray-900">
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-4 text-sm text-primary-100">
          Total elapsed (all sessions): {formatDuration(allTimeTotal)}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(todayTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
            <ArrowUpRight className="h-4 w-4" />
            <span>{todayDeltaLabel}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeProjectsCount}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
            <span>{totalProjectsCount} total projects</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Team Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{teamMembersCount}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
            <ArrowUpRight className="h-4 w-4" />
            <span>{newMembersThisWeek} new this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Productivity</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{productivityScore}%</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
            <ArrowUpRight className="h-4 w-4" />
            <span>Based on billable ratio this week</span>
          </div>
        </div>
      </div>

      {/* Today's Entries */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Time Entries</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {todayEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No time entries yet today</p>
              <p className="text-sm">Start tracking to see your entries here</p>
            </div>
          ) : (
            todayEntries.map((entry) => (
              <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{entry.project?.name || 'No Project'}</p>
                    <p className="text-sm text-gray-500">{entry.description || 'No description'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatDuration(entry.duration)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(entry.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
