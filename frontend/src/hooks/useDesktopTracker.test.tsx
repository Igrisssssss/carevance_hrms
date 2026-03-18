import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_TIMER_IDLE_STOP_EVENT } from '@/lib/desktopTimerSession';
import { useDesktopTracker } from '@/hooks/useDesktopTracker';

const mocks = vi.hoisted(() => ({
  activeMock: vi.fn(),
  stopMock: vi.fn(),
  createActivityMock: vi.fn(),
  updateActivityMock: vi.fn(),
  deleteActivityMock: vi.fn(),
  uploadScreenshotMock: vi.fn(),
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
    isAuthenticated: true,
  }),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    timeEntryApi: {
      ...actual.timeEntryApi,
      active: mocks.activeMock,
      stop: mocks.stopMock,
    },
    activityApi: {
      ...actual.activityApi,
      create: mocks.createActivityMock,
      update: mocks.updateActivityMock,
      delete: mocks.deleteActivityMock,
    },
    screenshotApi: {
      ...actual.screenshotApi,
      upload: mocks.uploadScreenshotMock,
    },
  };
});

function TrackerHarness() {
  useDesktopTracker();
  return null;
}

describe('useDesktopTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T09:00:00Z'));
    sessionStorage.clear();
    localStorage.clear();

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

    mocks.activeMock.mockResolvedValue({
      data: {
        id: 55,
        user_id: 1,
        start_time: '2026-03-18T09:00:00Z',
        duration: 0,
        timer_slot: 'primary',
      },
    });
    mocks.stopMock.mockResolvedValue({ data: null });
    let nextActivityId = 501;
    mocks.createActivityMock.mockImplementation(async () => ({ data: { id: nextActivityId += 1 } }));
    mocks.updateActivityMock.mockResolvedValue({ data: { id: 501 } });
    mocks.deleteActivityMock.mockResolvedValue({ data: { message: 'Activity deleted successfully' } });
    mocks.uploadScreenshotMock.mockResolvedValue({ data: { id: 1 } });

    const idleSince = Date.now();

    window.desktopTracker = {
      captureScreenshot: vi.fn().mockResolvedValue(null),
      getSystemIdleSeconds: vi.fn().mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000)),
      getActiveWindowContext: vi.fn().mockResolvedValue({
        app: 'Visual Studio Code',
        title: 'Tracking Work',
        url: null,
      }),
      revealWindow: vi.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.desktopTracker;
  });

  it('stops the running timer after 5 minutes of idle time and raises the dashboard event', async () => {
    const idleStopListener = vi.fn();
    window.addEventListener(DESKTOP_TIMER_IDLE_STOP_EVENT, idleStopListener as EventListener);

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(mocks.deleteActivityMock).toHaveBeenCalledTimes(1);
    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'idle',
      duration: 180,
    }));
    expect(
      mocks.updateActivityMock.mock.calls.some(([, payload]) => payload?.duration === 300)
    ).toBe(true);
    expect(mocks.stopMock).toHaveBeenCalledWith({ timer_slot: 'primary' });
    expect(sessionStorage.getItem('desktop_timer_auto_start_suppressed:1')).toBe('1');
    expect(sessionStorage.getItem('desktop_timer_idle_auto_stop_notice:1')).toBe(
      'You were idle for 5 minutes, so your timer was stopped.'
    );
    expect(idleStopListener).toHaveBeenCalledTimes(1);
    expect(window.desktopTracker?.revealWindow).toHaveBeenCalledTimes(1);

    window.removeEventListener(DESKTOP_TIMER_IDLE_STOP_EVENT, idleStopListener as EventListener);
  });
});
