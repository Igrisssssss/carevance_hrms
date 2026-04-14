import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsWorkspace from '@/pages/ReportsWorkspace';
import { renderWithProviders } from '@/test/renderWithProviders';

const mocks = vi.hoisted(() => ({
  getAllUsersMock: vi.fn(),
  groupsListMock: vi.fn(),
  overallMock: vi.fn(),
  activityGetAllMock: vi.fn(),
  authUser: {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
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
    userApi: {
      ...actual.userApi,
      getAll: mocks.getAllUsersMock,
    },
    reportGroupApi: {
      ...actual.reportGroupApi,
      list: mocks.groupsListMock,
    },
    reportApi: {
      ...actual.reportApi,
      overall: mocks.overallMock,
    },
    activityApi: {
      ...actual.activityApi,
      getAll: mocks.activityGetAllMock,
    },
  };
});

describe('ReportsWorkspace timeline navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    mocks.getAllUsersMock.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Irbaz Mavli',
          email: 'irbaz@example.com',
          role: 'employee',
        },
      ],
    });

    mocks.groupsListMock.mockResolvedValue({
      data: {
        data: [],
      },
    });

    mocks.overallMock.mockResolvedValue({
      data: {
        summary: {
          total_duration: 3600,
          idle_duration: 600,
          active_users: 1,
          users_count: 1,
        },
        by_user: [],
        by_day: [],
      },
    });

    mocks.activityGetAllMock.mockResolvedValue({
      data: {
        data: [
          {
            id: 11,
            type: 'app',
            name: 'Visual Studio Code',
            duration: 180,
            recorded_at: '2026-04-14T09:30:00.000Z',
            user: {
              id: 1,
              name: 'Irbaz Mavli',
            },
          },
        ],
      },
    });
  });

  it('renders timeline safely when switching from another report mode', async () => {
    const { rerender } = renderWithProviders(<ReportsWorkspace mode="productivity" />);

    expect(await screen.findByText('Productivity Summary')).toBeInTheDocument();
    expect(await screen.findByText('Tracked Time')).toBeInTheDocument();

    rerender(<ReportsWorkspace mode="timeline" />);

    expect(await screen.findByText('Timeline')).toBeInTheDocument();
    expect(await screen.findByText('Activity Timeline')).toBeInTheDocument();
    expect(await screen.findByText('All timeline events')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
  });
});
