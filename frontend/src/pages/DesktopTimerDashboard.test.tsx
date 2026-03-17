import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesktopTimerDashboard from '@/pages/DesktopTimerDashboard';
import { renderWithProviders } from '@/test/renderWithProviders';

const mocks = vi.hoisted(() => ({
  summaryMock: vi.fn(),
  attendanceTodayMock: vi.fn(),
  overtimeCreateMock: vi.fn(),
  startMock: vi.fn(),
  stopMock: vi.fn(),
  updateMock: vi.fn(),
  todayMock: vi.fn(),
  getProjectsMock: vi.fn(),
  getProjectTasksMock: vi.fn(),
  authUser: {
    id: 1,
    name: 'Employee User',
    email: 'employee@example.com',
    role: 'employee',
    organization_id: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.authUser,
  }),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    dashboardApi: { summary: mocks.summaryMock },
    attendanceApi: { today: mocks.attendanceTodayMock },
    attendanceTimeEditApi: { create: mocks.overtimeCreateMock },
    timeEntryApi: {
      start: mocks.startMock,
      stop: mocks.stopMock,
      update: mocks.updateMock,
      today: mocks.todayMock,
    },
    projectApi: {
      getAll: mocks.getProjectsMock,
      getTasks: mocks.getProjectTasksMock,
    },
  };
});

describe('DesktopTimerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mocks.authUser = {
      id: 1,
      name: 'Employee User',
      email: 'employee@example.com',
      role: 'employee',
      organization_id: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    };

    mocks.summaryMock
      .mockResolvedValueOnce({
        data: {
          active_timer: null,
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      })
      .mockResolvedValue({
        data: {
          active_timer: {
            id: 99,
            user_id: 1,
            project_id: 7,
            task_id: null,
            start_time: '2026-03-16T09:00:00Z',
            duration: 0,
            timer_slot: 'primary',
            created_at: '2026-03-16T09:00:00Z',
            updated_at: '2026-03-16T09:00:00Z',
            project: { id: 7, name: 'Core Platform', status: 'active', color: '#3B82F6' },
            task: null,
          },
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      });

    mocks.attendanceTodayMock.mockResolvedValue({
      data: {
        shift_target_seconds: 28800,
        record: {
          worked_seconds: 0,
          is_checked_in: false,
          attendance_date: '2026-03-16',
        },
      },
    });

    mocks.getProjectsMock.mockResolvedValue({
      data: [{ id: 7, name: 'Core Platform', status: 'active', color: '#3B82F6' }],
    });

    mocks.getProjectTasksMock.mockResolvedValue({
      data: [
        {
          id: 42,
          project_id: 7,
          title: 'Write sync logic',
          description: 'Connect the running timer to project task selection.',
          status: 'todo',
          priority: 'medium',
          assignee_id: 1,
          created_at: '2026-03-16T09:00:00Z',
          updated_at: '2026-03-16T09:00:00Z',
        },
      ],
    });

    mocks.startMock.mockResolvedValue({
      data: {
        id: 99,
        user_id: 1,
        project_id: null,
        task_id: null,
        start_time: '2026-03-16T09:00:00Z',
        duration: 0,
        timer_slot: 'primary',
        created_at: '2026-03-16T09:00:00Z',
        updated_at: '2026-03-16T09:00:00Z',
      },
    });

    mocks.updateMock.mockResolvedValue({
      data: {
        id: 99,
        user_id: 1,
        project_id: 7,
        task_id: 42,
        start_time: '2026-03-16T09:00:00Z',
        duration: 0,
        timer_slot: 'primary',
        created_at: '2026-03-16T09:00:00Z',
        updated_at: '2026-03-16T09:05:00Z',
        project: { id: 7, name: 'Core Platform', status: 'active', color: '#3B82F6' },
        task: {
          id: 42,
          project_id: 7,
          title: 'Write sync logic',
          description: 'Connect the running timer to project task selection.',
          status: 'todo',
          priority: 'medium',
          created_at: '2026-03-16T09:00:00Z',
          updated_at: '2026-03-16T09:00:00Z',
        },
      },
    });

    mocks.stopMock.mockResolvedValue({ data: null });
    mocks.todayMock.mockResolvedValue({ data: { time_entries: [], total_duration: 0 } });
  });

  it('auto-starts for employees and lets the running timer task be changed from the desktop block', async () => {
    const user = userEvent.setup();

    renderWithProviders(<DesktopTimerDashboard />);

    expect(await screen.findByText(/timer running/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.startMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mocks.getProjectTasksMock).toHaveBeenCalledWith(7);
    });

    await user.selectOptions(screen.getByRole('combobox', { name: /active timer task/i }), '42');

    await waitFor(() => {
      expect(mocks.updateMock).toHaveBeenCalledWith(99, expect.objectContaining({ project_id: 7, task_id: 42 }));
    });
  });

  it('keeps the timer stopped after a manual pause when the dashboard remounts', async () => {
    mocks.summaryMock.mockReset();
    mocks.summaryMock
      .mockResolvedValueOnce({
        data: {
          active_timer: null,
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          active_timer: {
            id: 99,
            user_id: 1,
            project_id: 7,
            task_id: null,
            start_time: '2026-03-16T09:00:00Z',
            duration: 0,
            timer_slot: 'primary',
            created_at: '2026-03-16T09:00:00Z',
            updated_at: '2026-03-16T09:00:00Z',
            project: { id: 7, name: 'Core Platform', status: 'active', color: '#3B82F6' },
            task: null,
          },
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      })
      .mockResolvedValue({
        data: {
          active_timer: null,
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      });

    const user = userEvent.setup();
    const firstRender = renderWithProviders(<DesktopTimerDashboard />);

    await waitFor(() => {
      expect(mocks.startMock).toHaveBeenCalledTimes(1);
    });

    await user.click(await screen.findByRole('button', { name: /pause timer/i }));

    await waitFor(() => {
      expect(mocks.stopMock).toHaveBeenCalledTimes(1);
    });

    firstRender.unmount();

    renderWithProviders(<DesktopTimerDashboard />);

    await waitFor(() => {
      expect(mocks.summaryMock).toHaveBeenCalledTimes(4);
      expect(mocks.startMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
  });

  it('auto-starts for a newly logged-in user even if another user paused earlier', async () => {
    sessionStorage.setItem('desktop_timer_auto_start_suppressed:1', '1');
    mocks.authUser = {
      ...mocks.authUser,
      id: 2,
      email: 'different@example.com',
      name: 'Different Employee',
    };

    mocks.summaryMock.mockReset();
    mocks.summaryMock
      .mockResolvedValueOnce({
        data: {
          active_timer: null,
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      })
      .mockResolvedValue({
        data: {
          active_timer: {
            id: 199,
            user_id: 2,
            project_id: 7,
            task_id: null,
            start_time: '2026-03-16T09:00:00Z',
            duration: 0,
            timer_slot: 'primary',
            created_at: '2026-03-16T09:00:00Z',
            updated_at: '2026-03-16T09:00:00Z',
            project: { id: 7, name: 'Core Platform', status: 'active', color: '#3B82F6' },
            task: null,
          },
          today_entries: [],
          today_total_elapsed_duration: 0,
          all_time_total_elapsed_duration: 0,
          team_members_count: 4,
          new_members_this_week: 1,
          productivity_score: 82,
          active_projects_count: 1,
          total_projects_count: 1,
        },
      });

    mocks.startMock.mockResolvedValueOnce({
      data: {
        id: 199,
        user_id: 2,
        project_id: null,
        task_id: null,
        start_time: '2026-03-16T09:00:00Z',
        duration: 0,
        timer_slot: 'primary',
        created_at: '2026-03-16T09:00:00Z',
        updated_at: '2026-03-16T09:00:00Z',
      },
    });

    renderWithProviders(<DesktopTimerDashboard />);

    await waitFor(() => {
      expect(mocks.startMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/timer running/i)).toBeInTheDocument();
  });
});
