import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '@/components/Layout';
import { renderWithProviders } from '@/test/renderWithProviders';

const authState = vi.hoisted(() => ({
  value: {
    user: null,
    logout: vi.fn(),
    token: 'test-token',
  },
}));

const apiMocks = vi.hoisted(() => ({
  getUnreadSummary: vi.fn().mockResolvedValue({ data: { unread_messages: 0, unread_conversations: 0, unread_senders: 0 } }),
  leaveList: vi.fn().mockResolvedValue({ data: { data: [] } }),
  attendanceTimeEditList: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState.value,
}));

vi.mock('@/hooks/useDesktopTracker', () => ({
  useDesktopTracker: () => undefined,
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    chatApi: { getUnreadSummary: apiMocks.getUnreadSummary },
    leaveApi: { list: apiMocks.leaveList },
    attendanceTimeEditApi: { list: apiMocks.attendanceTimeEditList },
    notificationApi: {
      list: vi.fn().mockResolvedValue({ data: { data: [], unread_count: 0 } }),
      markAllRead: vi.fn().mockResolvedValue({}),
      markRead: vi.fn().mockResolvedValue({}),
    },
  };
});

describe('Layout navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.desktopTracker;
    apiMocks.getUnreadSummary.mockResolvedValue({ data: { unread_messages: 0, unread_conversations: 0, unread_senders: 0 } });
    apiMocks.leaveList.mockResolvedValue({ data: { data: [] } });
    apiMocks.attendanceTimeEditList.mockResolvedValue({ data: { data: [] } });
    authState.value = {
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        organization_id: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      logout: vi.fn(),
      token: 'test-token',
    };
  });

  it('shows admin-only navigation items for admins', async () => {
    renderWithProviders(<Layout />, { route: '/dashboard' });

    expect((await screen.findAllByText('Reports')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Payroll').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Task').length).toBeGreaterThan(0);
    expect(screen.queryByText('Add Employee')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    expect(await screen.findByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Approval Inbox')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('hides admin-only navigation items for employees', async () => {
    authState.value = {
      user: {
        id: 2,
        name: 'Employee',
        email: 'employee@example.com',
        role: 'employee',
        organization_id: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      logout: vi.fn(),
      token: 'test-token',
    };

    renderWithProviders(<Layout />, { route: '/dashboard' });

    expect((await screen.findAllByText('Attendance')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Attendance').length).toBeGreaterThan(0);
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /employee/i }));

    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Employees')).not.toBeInTheDocument();
    expect(screen.queryByText('Approval Inbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
  });

  it('shows the unread chat badge on the chat navigation item', async () => {
    apiMocks.getUnreadSummary.mockResolvedValue({ data: { unread_messages: 4, unread_conversations: 2, unread_senders: 2 } });

    renderWithProviders(<Layout />, { route: '/dashboard' });

    await waitFor(() => {
      const chatLink = screen.getByRole('link', { name: /chat/i });
      expect(within(chatLink).getByText('4')).toBeInTheDocument();
    });
  });

  it('shows desktop updates inside the profile menu and opens the update panel', async () => {
    window.desktopTracker = {
      captureScreenshot: vi.fn(),
      getSystemIdleSeconds: vi.fn(),
      getActiveWindowContext: vi.fn(),
      revealWindow: vi.fn(),
      getUpdateState: vi.fn().mockResolvedValue({
        enabled: true,
        status: 'current',
        currentVersion: '1.0.2',
        message: 'You are already on the latest desktop version.',
        releaseNotes: '',
        releaseDate: null,
        availableVersion: null,
        downloadedVersion: null,
        progressPercent: 0,
      }),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      onUpdateState: vi.fn(),
      clearUpdateStateListeners: vi.fn(),
    };

    authState.value = {
      user: {
        id: 2,
        name: 'Employee',
        email: 'employee@example.com',
        role: 'employee',
        organization_id: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      logout: vi.fn(),
      token: 'test-token',
    };

    renderWithProviders(<Layout />, { route: '/dashboard' });

    fireEvent.click(await screen.findByRole('button', { name: /employee/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^updates$/i }));

    expect(await screen.findByText(/desktop updates/i)).toBeInTheDocument();
    expect(screen.getByText(/carevance tracker v1.0.2/i)).toBeInTheDocument();
  });

  it('shows a direct payroll navigation item in desktop shell for admins only', async () => {
    window.desktopTracker = {
      captureScreenshot: vi.fn(),
      getSystemIdleSeconds: vi.fn(),
      getActiveWindowContext: vi.fn(),
      revealWindow: vi.fn(),
      getUpdateState: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      onUpdateState: vi.fn(),
      clearUpdateStateListeners: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const { rerender } = renderWithProviders(<Layout />, { route: '/dashboard' });

    fireEvent.click(await screen.findByRole('button', { name: /payroll/i }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('/payroll?desktop_token=test-token'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    authState.value = {
      user: {
        id: 2,
        name: 'Employee',
        email: 'employee@example.com',
        role: 'employee',
        organization_id: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      logout: vi.fn(),
      token: 'test-token',
    };

    rerender(<Layout />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /payroll/i })).not.toBeInTheDocument();
    });

    openSpy.mockRestore();
  });
});
