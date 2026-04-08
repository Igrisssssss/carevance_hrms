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
  captureScreenshotMock: vi.fn(),
  getSystemIdleSecondsMock: vi.fn(),
  getActiveWindowContextMock: vi.fn(),
  revealWindowMock: vi.fn(),
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
    mocks.captureScreenshotMock.mockResolvedValue(null);
    mocks.getSystemIdleSecondsMock.mockResolvedValue(0);
    mocks.getActiveWindowContextMock.mockResolvedValue({
      app: 'Visual Studio Code',
      title: 'Tracking Work',
      url: null,
    });
    mocks.revealWindowMock.mockResolvedValue(true);

    window.desktopTracker = {
      captureScreenshot: mocks.captureScreenshotMock,
      getSystemIdleSeconds: mocks.getSystemIdleSecondsMock,
      getActiveWindowContext: mocks.getActiveWindowContextMock,
      revealWindow: mocks.revealWindowMock,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.desktopTracker;
  });

  it('stops the running timer after 5 minutes of idle time and raises the dashboard event', async () => {
    const idleSince = Date.now();
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000));
    const idleStopListener = vi.fn();
    window.addEventListener(DESKTOP_TIMER_IDLE_STOP_EVENT, idleStopListener as EventListener);

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(mocks.deleteActivityMock).not.toHaveBeenCalled();
    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'idle',
      duration: 180,
    }));
    expect(
      mocks.updateActivityMock.mock.calls.some(([, payload]) => payload?.duration === 300)
    ).toBe(true);
    expect(mocks.stopMock).toHaveBeenCalledWith({
      timer_slot: 'primary',
      auto_stopped_for_idle: true,
      idle_seconds: 300,
      last_activity_at: '2026-03-18T09:00:00.000Z',
    });
    expect(sessionStorage.getItem('desktop_timer_auto_start_suppressed:1')).toBe('1');
    expect(sessionStorage.getItem('desktop_timer_idle_auto_stop_notice:1')).toBe(
      'You were idle for 5 minutes, so your timer was stopped.'
    );
    expect(idleStopListener).toHaveBeenCalledTimes(1);
    expect(mocks.revealWindowMock).toHaveBeenCalledTimes(1);

    window.removeEventListener(DESKTOP_TIMER_IDLE_STOP_EVENT, idleStopListener as EventListener);
  });

  it('does not stop the timer when recent real activity resets the continuous idle countdown', async () => {
    let lastSystemActivityAt = Date.now();
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - lastSystemActivityAt) / 1000));
    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 55 * 1000);
    });

    await act(async () => {
      lastSystemActivityAt = Date.now();
      window.dispatchEvent(new Event('scroll'));
      await vi.advanceTimersByTimeAsync(10 * 1000);
    });

    expect(mocks.stopMock).not.toHaveBeenCalled();
  });

  it('still auto-stops after 5 minutes when page events fire during true system idle', async () => {
    const idleSince = Date.now();
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000));

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 55 * 1000);
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(10 * 1000);
    });

    expect(mocks.stopMock).toHaveBeenCalledWith({
      timer_slot: 'primary',
      auto_stopped_for_idle: true,
      idle_seconds: 300,
      last_activity_at: '2026-03-18T09:00:00.000Z',
    });
  });

  it('uses the 1 second idle guard so auto-stop does not wait for the next 5 second activity tick', async () => {
    const idleSince = Date.now() - 2000;
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000));

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 57 * 1000);
    });

    expect(mocks.stopMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mocks.stopMock).toHaveBeenCalledWith({
      timer_slot: 'primary',
      auto_stopped_for_idle: true,
      idle_seconds: 300,
      last_activity_at: '2026-03-18T08:59:58.000Z',
    });
  });

  it('backs off idle auto-stop retries when backend returns 409 with retry_after_seconds', async () => {
    const idleSince = Date.now();
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000));
    mocks.stopMock
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            retry_after_seconds: 20,
          },
        },
      })
      .mockResolvedValue({ data: null });

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(mocks.stopMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 1000);
    });

    expect(mocks.stopMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 1000);
    });

    expect(mocks.stopMock).toHaveBeenCalledTimes(2);
  });

  it('captures screenshots on the single 3 minute interval while the timer is running', async () => {
    mocks.captureScreenshotMock.mockResolvedValue('data:image/png;base64,ZmFrZQ==');

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    });

    expect(mocks.captureScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenNthCalledWith(
      1,
      55,
      'data:image/png;base64,ZmFrZQ==',
      expect.stringMatching(/^capture-\d+\.png$/)
    );
  });

  it('continues screenshot capture when the user is idle at the screenshot interval', async () => {
    const idleSince = Date.now();
    mocks.captureScreenshotMock.mockResolvedValue('data:image/png;base64,ZmFrZQ==');
    mocks.getSystemIdleSecondsMock.mockImplementation(async () => Math.floor((Date.now() - idleSince) / 1000));

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    });

    expect(mocks.captureScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenNthCalledWith(
      1,
      55,
      'data:image/png;base64,ZmFrZQ==',
      expect.stringMatching(/^capture-\d+\.png$/)
    );
  });

  it('clears and recreates the screenshot interval cleanly on remount without duplicating captures', async () => {
    mocks.captureScreenshotMock.mockResolvedValue('data:image/png;base64,ZmFrZQ==');

    const firstRender = render(<TrackerHarness />);
    firstRender.unmount();

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    });

    expect(mocks.captureScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenCalledTimes(2);
  });

  it('recovers future screenshots when one screenshot capture call hangs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let captureCallCount = 0;
    mocks.captureScreenshotMock.mockImplementation(() => {
      captureCallCount += 1;

      if (captureCallCount === 1) {
        return new Promise(() => {});
      }

      return Promise.resolve('data:image/png;base64,ZmFrZQ==');
    });

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    });

    expect(mocks.captureScreenshotMock).toHaveBeenCalledTimes(1);
    expect(mocks.uploadScreenshotMock).toHaveBeenCalledTimes(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 1000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    });

    expect(mocks.captureScreenshotMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadScreenshotMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it('tracks browser activity duration from system-wide input even when the app window is not focused', async () => {
    mocks.getActiveWindowContextMock.mockResolvedValue({
      app: 'Google Chrome',
      title: 'Instagram - Google Chrome',
      url: null,
    });
    mocks.getSystemIdleSecondsMock.mockResolvedValue(0);

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'url',
      name: 'Instagram',
      duration: 5,
    }));
  });

  it('reuses the last reliable external context when active window lookup temporarily falls back to the app shell', async () => {
    document.title = 'CareVance HRMS Workspace';
    mocks.getActiveWindowContextMock
      .mockResolvedValueOnce({
        app: 'Google Chrome',
        title: 'GitHub - Google Chrome',
        url: null,
      })
      .mockResolvedValueOnce({
        app: 'CareVance',
        title: 'CareVance HRMS Workspace',
        url: null,
      });

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'url',
      name: 'GitHub',
      duration: 5,
    }));
    expect(mocks.createActivityMock).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'CareVance HRMS Workspace',
    }));
  });

  it('does not create misleading self-tracker activity rows before a reliable external context exists', async () => {
    document.title = 'CareVance HRMS Workspace';
    mocks.getActiveWindowContextMock.mockResolvedValue(null);

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'CareVance HRMS Workspace',
    }));
  });

  it('buffers active seconds during unreliable self context and attributes them once a reliable context returns', async () => {
    document.title = 'CareVance HRMS Workspace';
    mocks.getActiveWindowContextMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        app: 'Google Chrome',
        title: 'GitHub - Google Chrome',
        url: null,
      });

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'CareVance HRMS Workspace',
    }));
    expect(mocks.createActivityMock).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'GitHub',
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'url',
      name: 'GitHub',
      duration: 10,
    }));
  });

  it('reuses the last reliable website context when the browser briefly reports a generic new tab', async () => {
    mocks.getActiveWindowContextMock
      .mockResolvedValueOnce({
        app: 'Google Chrome',
        title: 'YouTube - Google Chrome',
        url: null,
      })
      .mockResolvedValueOnce({
        app: 'Google Chrome',
        title: 'New Tab - Google Chrome',
        url: null,
      });

    render(<TrackerHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 1000);
    });

    expect(mocks.createActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'url',
      name: 'YouTube',
      duration: 5,
    }));
    expect(mocks.createActivityMock).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Tab',
    }));
  });
});
