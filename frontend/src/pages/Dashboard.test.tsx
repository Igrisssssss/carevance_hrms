import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { renderWithProviders } from '@/test/renderWithProviders';

const mocks = vi.hoisted(() => ({
  summaryMock: vi.fn(),
  attendanceTodayMock: vi.fn(),
  overtimeCreateMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Employee User', email: 'employee@example.com', role: 'employee', organization_id: 1, is_active: true, created_at: '', updated_at: '' },
  }),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    dashboardApi: { summary: mocks.summaryMock },
    attendanceApi: { today: mocks.attendanceTodayMock },
    attendanceTimeEditApi: { create: mocks.overtimeCreateMock },
  };
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.summaryMock.mockResolvedValue({
      data: {
        today_entries: [
          {
            id: 5,
            start_time: '2026-03-11T09:00:00Z',
            end_time: '2026-03-11T11:00:00Z',
            duration: 7200,
            description: 'Worked on QA fixes',
            project: { id: 7, name: 'Core Platform' },
          },
        ],
        today_total_elapsed_duration: 14400,
        all_time_total_elapsed_duration: 86400,
        team_members_count: 4,
        new_members_this_week: 1,
        productivity_score: 82,
        active_projects_count: 2,
        total_projects_count: 3,
      },
    });

    mocks.attendanceTodayMock.mockResolvedValue({
      data: {
        shift_target_seconds: 28800,
        record: {
          worked_seconds: 14400,
          is_checked_in: true,
          shift_target_seconds: 28800,
          attendance_date: '2026-03-11',
        },
      },
    });
  });

  it('shows employee progress metrics without timer controls', async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/today's work progress/i)).toBeInTheDocument();
    expect(screen.getByText('Worked Today')).toBeInTheDocument();
    expect(screen.getByText('Time Left Today')).toBeInTheDocument();
    expect(screen.getByText('Today at a glance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sending|send overtime proof/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/start tracking/i)).not.toBeInTheDocument();
  });
});
