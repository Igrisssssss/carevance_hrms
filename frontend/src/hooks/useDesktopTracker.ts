import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildTrackedContextName } from '@/lib/activityProductivity';
import { idleAutoStopThresholdSeconds, idleGuardIntervalMs, idleTrackThresholdSeconds } from '@/lib/runtimeConfig';
import { isTrackedTimerUser } from '@/lib/permissions';
import {
  clearDesktopScreenshotCaptureLock,
  completeDesktopScreenshotCapture,
  DESKTOP_SCREENSHOT_SCHEDULER_KEY,
  DESKTOP_TIMER_STARTED_EVENT,
  DESKTOP_TIMER_STOPPED_EVENT,
  type DesktopTimerSessionDetail,
  emitDesktopTimerIdleStop,
  setIdleAutoStopNotice,
  suppressAutoStart,
  tryBeginDesktopScreenshotCapture,
} from '@/lib/desktopTimerSession';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';
import type { TimeEntry } from '@/types';

const ACTIVITY_TRACK_INTERVAL_MS = 5000;
const SCREENSHOT_INTERVAL_MS = 3 * 60 * 1000;
const SCREENSHOT_INITIAL_CAPTURE_DELAY_MS = 1500;
const IDLE_THRESHOLD_SECONDS = idleTrackThresholdSeconds;
const IDLE_AUTO_STOP_THRESHOLD_SECONDS = Math.max(idleAutoStopThresholdSeconds, IDLE_THRESHOLD_SECONDS);
const IDLE_GUARD_INTERVAL_MS = idleGuardIntervalMs;
const RELIABLE_CONTEXT_REUSE_WINDOW_MS = 30 * 1000;
const BROWSER_APP_KEYWORDS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi'];
const SELF_TRACKER_KEYWORDS = ['carevance', 'carevance hrms', 'timetrackpro'];
const GENERIC_BROWSER_CONTEXT_PATTERNS = [
  /^new tab$/i,
  /^about:blank$/i,
  /^chrome:\/\/newtab\/?$/i,
  /^edge:\/\/newtab\/?$/i,
  /^google chrome$/i,
  /^microsoft edge$/i,
  /^mozilla firefox$/i,
  /^brave$/i,
  /^opera$/i,
  /^vivaldi$/i,
];

const formatIdleDurationLabel = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'} ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
};

const IDLE_AUTO_STOP_MESSAGE = `You were idle for ${formatIdleDurationLabel(IDLE_AUTO_STOP_THRESHOLD_SECONDS)}, so your timer was stopped.`;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'mouseup',
  'keydown',
  'keyup',
  'click',
  'dblclick',
  'wheel',
  'scroll',
  'focus',
  'touchstart',
  'touchmove',
  'pointerdown',
  'pointermove',
];

let desktopTrackerRunSequence = 0;

type ActiveSegment = {
  activityId: number;
  durationSeconds: number;
  signature: string;
  kind: 'tracked' | 'idle';
  contextName?: string;
  activityType?: 'app' | 'url';
};

type ReliableTrackingContext = {
  contextName: string;
  activityType: 'app' | 'url';
  capturedAtMs: number;
};

const isSelfTrackerContext = (context: { app?: string | null; title?: string | null; url?: string | null }) => {
  const haystack = [context.app, context.title, context.url]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');

  return SELF_TRACKER_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

const isGenericBrowserContext = (contextName: string, activityType: 'app' | 'url') => {
  if (activityType !== 'url') {
    return false;
  }

  const normalized = String(contextName || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return GENERIC_BROWSER_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const useDesktopTracker = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const lastInputRef = useRef<number>(Date.now());
  const lastTickAtRef = useRef<number | null>(null);
  const activeSegmentRef = useRef<ActiveSegment | null>(null);
  const activeEntryRef = useRef<TimeEntry | null>(null);
  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleGuardIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotInitialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdleRewindRef = useRef<Map<number, number>>(new Map());
  const lastAutoStoppedEntryIdRef = useRef<number | null>(null);
  const activeScreenshotEntryIdRef = useRef<number | null>(null);
  const idleStopInFlightRef = useRef(false);
  const idleStopBlockedUntilMsRef = useRef(0);
  const lastReliableTrackingContextRef = useRef<ReliableTrackingContext | null>(null);

  const clearTrackerIntervals = () => {
    if (activityIntervalRef.current !== null) {
      clearInterval(activityIntervalRef.current);
      activityIntervalRef.current = null;
    }

    if (idleGuardIntervalRef.current !== null) {
      clearInterval(idleGuardIntervalRef.current);
      idleGuardIntervalRef.current = null;
    }

    if (screenshotIntervalRef.current !== null) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }

    if (screenshotInitialTimeoutRef.current !== null) {
      clearTimeout(screenshotInitialTimeoutRef.current);
      screenshotInitialTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const markInput = () => {
      lastInputRef.current = Date.now();
      pendingIdleRewindRef.current.clear();
    };

    const markVisibleActivity = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        markInput();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markInput);
    });
    document.addEventListener('visibilitychange', markVisibleActivity);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markInput);
      });
      document.removeEventListener('visibilitychange', markVisibleActivity);
    };
  }, []);

  useEffect(() => {
    const isTrackedUser = isTrackedTimerUser(user);
    const desktopApi = window.desktopTracker;
    if (!isAuthenticated || !isTrackedUser || !desktopApi) {
      clearTrackerIntervals();
      activeSegmentRef.current = null;
      activeEntryRef.current = null;
      pendingIdleRewindRef.current.clear();
      lastAutoStoppedEntryIdRef.current = null;
      activeScreenshotEntryIdRef.current = null;
      idleStopInFlightRef.current = false;
      idleStopBlockedUntilMsRef.current = 0;
      lastReliableTrackingContextRef.current = null;
      return;
    }

    const runId = ++desktopTrackerRunSequence;
    const isCurrentRun = () => desktopTrackerRunSequence === runId;
    let inFlight = false;
    let screenshotInFlight = false;
    clearTrackerIntervals();
    lastTickAtRef.current = Date.now();
    lastInputRef.current = Date.now();
    activeSegmentRef.current = null;
    activeEntryRef.current = null;
    pendingIdleRewindRef.current.clear();
    lastAutoStoppedEntryIdRef.current = null;
    activeScreenshotEntryIdRef.current = null;
    idleStopInFlightRef.current = false;
    idleStopBlockedUntilMsRef.current = 0;
    lastReliableTrackingContextRef.current = null;

    const scheduleInitialScreenshotCapture = () => {
      if (screenshotInitialTimeoutRef.current !== null) {
        clearTimeout(screenshotInitialTimeoutRef.current);
      }

      screenshotInitialTimeoutRef.current = setTimeout(() => {
        screenshotInitialTimeoutRef.current = null;
        void captureScreenshotOnInterval();
      }, SCREENSHOT_INITIAL_CAPTURE_DELAY_MS);
    };

    const syncScreenshotInterval = (timeEntryId: number | null) => {
      if (activeScreenshotEntryIdRef.current === timeEntryId) {
        return;
      }

      if (screenshotIntervalRef.current !== null) {
        clearInterval(screenshotIntervalRef.current);
        screenshotIntervalRef.current = null;
      }

      activeScreenshotEntryIdRef.current = timeEntryId;

      if (timeEntryId === null) {
        sessionStorage.removeItem(DESKTOP_SCREENSHOT_SCHEDULER_KEY);
        clearDesktopScreenshotCaptureLock();
        return;
      }

      sessionStorage.setItem(DESKTOP_SCREENSHOT_SCHEDULER_KEY, String(timeEntryId));
      scheduleInitialScreenshotCapture();

      screenshotIntervalRef.current = setInterval(() => {
        void captureScreenshotOnInterval();
      }, SCREENSHOT_INTERVAL_MS);
    };

    const getIdleState = async (now: number) => {
      try {
        const idleSecondsSystem = Number(await desktopApi.getSystemIdleSeconds());

        if (Number.isFinite(idleSecondsSystem)) {
          const safeIdleSecondsSystem = Math.max(0, Math.floor(idleSecondsSystem));

          return {
            idleSeconds: safeIdleSecondsSystem,
            lastActivityAtMs: Math.max(0, now - (safeIdleSecondsSystem * 1000)),
          };
        }
      } catch (error) {
        console.warn('Desktop tracker system idle lookup failed, falling back to page input activity.', error);
      }

      const idleSecondsFromInput = Math.max(0, Math.floor((now - lastInputRef.current) / 1000));

      return {
        idleSeconds: idleSecondsFromInput,
        lastActivityAtMs: lastInputRef.current,
      };
    };

    const rewindTrackedIdleWindow = async (recordedAt: string) => {
      const rewindPoints = Array.from(pendingIdleRewindRef.current.entries());
      pendingIdleRewindRef.current.clear();

      await Promise.all(rewindPoints.map(async ([activityId, baselineDuration]) => {
        if (baselineDuration > 0) {
          await activityApi.update(activityId, {
            duration: baselineDuration,
            recorded_at: recordedAt,
          });
          return;
        }

        await activityApi.delete(activityId);
      }));
    };

    const attemptIdleAutoStop = async (
      activeEntry: TimeEntry,
      idleSeconds: number,
      lastActivityAtMs: number,
      recordedAt: string,
    ) => {
      const now = Date.now();
      if (
        idleSeconds < IDLE_AUTO_STOP_THRESHOLD_SECONDS
        || lastAutoStoppedEntryIdRef.current === activeEntry.id
        || idleStopInFlightRef.current
        || now < idleStopBlockedUntilMsRef.current
      ) {
        return false;
      }

      idleStopInFlightRef.current = true;

      try {
        console.info('[desktop-tracker] idle auto-stop requested', {
          session_id: activeEntry.id,
          employee_id: userId,
          timer_start_time: activeEntry.start_time,
          last_activity_time: new Date(lastActivityAtMs).toISOString(),
          idle_end_time: recordedAt,
          continuous_idle_duration: idleSeconds,
          timer_stop_reason: 'continuous_idle_threshold',
        });
        await timeEntryApi.stop({
          timer_slot: 'primary',
          auto_stopped_for_idle: true,
          idle_seconds: idleSeconds,
          last_activity_at: new Date(lastActivityAtMs).toISOString(),
        });
        lastAutoStoppedEntryIdRef.current = activeEntry.id;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          activeSegmentRef.current = null;
          activeEntryRef.current = null;
          pendingIdleRewindRef.current.clear();
          syncScreenshotInterval(null);
          idleStopBlockedUntilMsRef.current = 0;
          return true;
        }

        if (status === 409) {
          const retryAfterSecondsRaw = Number(error?.response?.data?.retry_after_seconds);
          const retryAfterSeconds = Number.isFinite(retryAfterSecondsRaw)
            ? Math.max(1, Math.floor(retryAfterSecondsRaw))
            : 15;
          idleStopBlockedUntilMsRef.current = Date.now() + (retryAfterSeconds * 1000);

          if (activeSegmentRef.current?.kind === 'idle') {
            try {
              await activityApi.delete(activeSegmentRef.current.activityId);
            } catch (deleteError) {
              console.warn('Desktop tracker idle validation rewind failed:', deleteError);
            }
          }
          activeSegmentRef.current = null;
          pendingIdleRewindRef.current.clear();
          lastInputRef.current = Date.now();
          console.info('[desktop-tracker] idle auto-stop rejected by backend validation', {
            session_id: activeEntry.id,
            employee_id: userId,
            timer_start_time: activeEntry.start_time,
            last_activity_time: new Date(lastInputRef.current).toISOString(),
            retry_after_seconds: retryAfterSeconds,
          });
          return true;
        }

        if (status !== 404) {
          throw error;
        }
      } finally {
        idleStopInFlightRef.current = false;
      }

      activeSegmentRef.current = null;
      activeEntryRef.current = null;
      pendingIdleRewindRef.current.clear();
      syncScreenshotInterval(null);
      idleStopBlockedUntilMsRef.current = 0;

      if (userId) {
        suppressAutoStart(userId);
        setIdleAutoStopNotice(userId, IDLE_AUTO_STOP_MESSAGE);
        emitDesktopTimerIdleStop({
          userId,
          message: IDLE_AUTO_STOP_MESSAGE,
        });
      }

      if (typeof desktopApi.revealWindow === 'function') {
        await desktopApi.revealWindow();
      }

      return true;
    };

    const tick = async () => {
      if (inFlight || !isCurrentRun()) return;
      const now = Date.now();
      const previousTickAt = lastTickAtRef.current ?? now;
      const elapsedSeconds = Math.max(
        1,
        Math.round((now - previousTickAt) / 1000)
      );
      lastTickAtRef.current = now;
      inFlight = true;
      try {
        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) {
          activeSegmentRef.current = null;
          activeEntryRef.current = null;
          lastAutoStoppedEntryIdRef.current = null;
          syncScreenshotInterval(null);
          return;
        }
        activeEntryRef.current = activeEntry;
        syncScreenshotInterval(activeEntry.id);

        const { idleSeconds, lastActivityAtMs } = await getIdleState(now);
        if (idleSeconds < IDLE_AUTO_STOP_THRESHOLD_SECONDS) {
          idleStopBlockedUntilMsRef.current = 0;
        }
        const trackedWindowEnd = Math.min(now, Math.max(lastActivityAtMs, previousTickAt));
        const trackedSecondsThisTick = Math.max(
          0,
          Math.round((trackedWindowEnd - previousTickAt) / 1000)
        );
        const activeContext = typeof desktopApi.getActiveWindowContext === 'function'
          ? await desktopApi.getActiveWindowContext()
          : null;
        const fallbackTitle = typeof document !== 'undefined' ? document.title : '';
        const recordedAt = new Date(now).toISOString();
        const rawAppName = String(activeContext?.app || '').trim();
        const rawUrl = String(activeContext?.url || '').trim();
        const rawIsBrowserApp = BROWSER_APP_KEYWORDS.some((keyword) => rawAppName.toLowerCase().includes(keyword));
        const rawContextName = buildTrackedContextName(activeContext || {});
        const rawActivityType: 'app' | 'url' = rawUrl || rawIsBrowserApp ? 'url' : 'app';
        const hasReliableDesktopContext = Boolean(rawContextName)
          && !isSelfTrackerContext(activeContext || {})
          && !isGenericBrowserContext(rawContextName, rawActivityType);

        if (hasReliableDesktopContext) {
          lastReliableTrackingContextRef.current = {
            contextName: rawContextName,
            activityType: rawActivityType,
            capturedAtMs: now,
          };
        }

        const currentTrackedSegment = activeSegmentRef.current?.kind === 'tracked'
          ? activeSegmentRef.current
          : null;
        const recentReliableTrackingContext = lastReliableTrackingContextRef.current
          && (now - lastReliableTrackingContextRef.current.capturedAtMs) <= RELIABLE_CONTEXT_REUSE_WINDOW_MS
            ? lastReliableTrackingContextRef.current
            : null;
        const fallbackTrackingContext = recentReliableTrackingContext
          || (currentTrackedSegment?.contextName && currentTrackedSegment.activityType
            ? {
                contextName: currentTrackedSegment.contextName,
                activityType: currentTrackedSegment.activityType,
              }
            : null);
        const resolvedTrackingContext = hasReliableDesktopContext
          ? {
              contextName: rawContextName,
              activityType: rawActivityType,
            }
          : fallbackTrackingContext;
        const contextName = resolvedTrackingContext?.contextName || fallbackTitle || 'Active Input';
        const activityType: 'app' | 'url' = resolvedTrackingContext?.activityType || 'app';

        if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
          const idleName = (`System Idle - ${contextName}`).slice(0, 255);
          const idleSignature = `${activeEntry.id}:idle:${lastActivityAtMs}`;
          const currentSegment = activeSegmentRef.current;

          if (currentSegment?.kind !== 'idle') {
            if (pendingIdleRewindRef.current.size > 0) {
              await rewindTrackedIdleWindow(recordedAt);
            }
            activeSegmentRef.current = null;
          }

          if (activeSegmentRef.current?.signature === idleSignature) {
            await activityApi.update(activeSegmentRef.current.activityId, {
              name: idleName,
              duration: idleSeconds,
              recorded_at: recordedAt,
            });
            activeSegmentRef.current.durationSeconds = idleSeconds;
          } else {
            const response = await activityApi.create({
              time_entry_id: activeEntry.id,
              type: 'idle' as const,
              name: idleName,
              duration: idleSeconds,
              recorded_at: recordedAt,
            });
            activeSegmentRef.current = {
              activityId: response.data.id,
              durationSeconds: idleSeconds,
              signature: idleSignature,
              kind: 'idle',
            };
          }

          if (await attemptIdleAutoStop(activeEntry, idleSeconds, lastActivityAtMs, recordedAt)) {
            return;
          }
        } else {
          if (trackedSecondsThisTick <= 0) {
            return;
          }

          if (
            !hasReliableDesktopContext
            && !fallbackTrackingContext
            && (
              isSelfTrackerContext({
                app: rawAppName,
                title: fallbackTitle,
                url: rawUrl,
              })
              || isGenericBrowserContext(rawContextName || fallbackTitle, rawActivityType)
            )
          ) {
            return;
          }

          const payload = {
            time_entry_id: activeEntry.id,
            type: activityType,
            name: contextName,
            duration: trackedSecondsThisTick,
            recorded_at: recordedAt,
          };
          const signature = `${payload.time_entry_id}:${payload.type}:${payload.name}`;
          const currentSegment = activeSegmentRef.current;

          if (currentSegment?.kind === 'tracked' && currentSegment.signature === signature) {
            const baselineDuration = currentSegment.durationSeconds;
            const nextDuration = baselineDuration + trackedSecondsThisTick;
            await activityApi.update(currentSegment.activityId, {
              duration: nextDuration,
              recorded_at: recordedAt,
            });
            currentSegment.durationSeconds = nextDuration;
            if (!pendingIdleRewindRef.current.has(currentSegment.activityId)) {
              pendingIdleRewindRef.current.set(currentSegment.activityId, baselineDuration);
            }
          } else {
            const response = await activityApi.create(payload);
            activeSegmentRef.current = {
              activityId: response.data.id,
              durationSeconds: trackedSecondsThisTick,
              signature,
              kind: 'tracked',
              contextName: payload.name,
              activityType: payload.type,
            };
            pendingIdleRewindRef.current.set(response.data.id, 0);
          }
        }
      } catch (error) {
        console.error('Desktop tracker tick failed:', error);
      } finally {
        inFlight = false;
      }
    };

    const runIdleGuard = async () => {
      if (!isCurrentRun()) return;

      const activeEntry = activeEntryRef.current;
      if (!activeEntry?.id) {
        return;
      }

      const now = Date.now();
      const { idleSeconds, lastActivityAtMs } = await getIdleState(now);
      if (idleSeconds < IDLE_AUTO_STOP_THRESHOLD_SECONDS) {
        idleStopBlockedUntilMsRef.current = 0;
        return;
      }

      await attemptIdleAutoStop(activeEntry, idleSeconds, lastActivityAtMs, new Date(now).toISOString());
    };

    const captureScreenshotOnInterval = async () => {
      if (screenshotInFlight || !isCurrentRun()) return;

      screenshotInFlight = true;
      try {
        const scheduledEntryId = activeScreenshotEntryIdRef.current;
        if (!scheduledEntryId) {
          return;
        }

        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) {
          activeEntryRef.current = null;
          syncScreenshotInterval(null);
          return;
        }
        activeEntryRef.current = activeEntry;

        if (activeEntry.id !== scheduledEntryId) {
          syncScreenshotInterval(activeEntry.id);
          return;
        }

        if (!tryBeginDesktopScreenshotCapture(activeEntry.id)) {
          return;
        }

        const now = Date.now();
        const screenshotDataUrl = await desktopApi.captureScreenshot();
        if (!screenshotDataUrl) {
          clearDesktopScreenshotCaptureLock(activeEntry.id);
          return;
        }

        await screenshotApi.upload(activeEntry.id, screenshotDataUrl, `capture-${now}.png`);
        completeDesktopScreenshotCapture(activeEntry.id);
      } catch (error) {
        clearDesktopScreenshotCaptureLock(activeScreenshotEntryIdRef.current);
        console.error('Desktop tracker screenshot capture failed:', error);
      } finally {
        screenshotInFlight = false;
      }
    };

    const handleTimerStarted = (event: Event) => {
      const detail = (event as CustomEvent<DesktopTimerSessionDetail>).detail;
      if (!detail || detail.userId !== userId || !detail.entryId || !isCurrentRun()) {
        return;
      }

      syncScreenshotInterval(detail.entryId);
    };

    const handleTimerStopped = (event: Event) => {
      const detail = (event as CustomEvent<DesktopTimerSessionDetail>).detail;
      if (!detail || detail.userId !== userId || !isCurrentRun()) {
        return;
      }

      activeEntryRef.current = null;
      syncScreenshotInterval(null);
    };

    activityIntervalRef.current = setInterval(() => {
      void tick();
    }, ACTIVITY_TRACK_INTERVAL_MS);
    idleGuardIntervalRef.current = setInterval(() => {
      void runIdleGuard();
    }, IDLE_GUARD_INTERVAL_MS);
    window.addEventListener(DESKTOP_TIMER_STARTED_EVENT, handleTimerStarted as EventListener);
    window.addEventListener(DESKTOP_TIMER_STOPPED_EVENT, handleTimerStopped as EventListener);
    void tick();

    return () => {
      clearTrackerIntervals();
      activeEntryRef.current = null;
      activeScreenshotEntryIdRef.current = null;
      idleStopInFlightRef.current = false;
      idleStopBlockedUntilMsRef.current = 0;
      sessionStorage.removeItem(DESKTOP_SCREENSHOT_SCHEDULER_KEY);
      clearDesktopScreenshotCaptureLock();
      window.removeEventListener(DESKTOP_TIMER_STARTED_EVENT, handleTimerStarted as EventListener);
      window.removeEventListener(DESKTOP_TIMER_STOPPED_EVENT, handleTimerStopped as EventListener);
      if (desktopTrackerRunSequence === runId) {
        desktopTrackerRunSequence += 1;
      }
    };
  }, [isAuthenticated, user, userId]);
};
