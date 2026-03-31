import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isTrackedTimerUser } from '@/lib/permissions';
import {
  emitDesktopTimerIdleStop,
  setIdleAutoStopNotice,
  suppressAutoStart,
} from '@/lib/desktopTimerSession';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';
import type { TimeEntry } from '@/types';

const ACTIVITY_TRACK_INTERVAL_MS = 5000;
const IDLE_GUARD_INTERVAL_MS = 1000;
const SCREENSHOT_INTERVAL_MS = 3 * 60 * 1000;
const IDLE_THRESHOLD_SECONDS = 3 * 60;
const IDLE_AUTO_STOP_THRESHOLD_SECONDS = 5 * 60;
const BROWSER_APP_KEYWORDS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi'];
const IDLE_AUTO_STOP_MESSAGE = 'You were idle for 5 minutes, so your timer was stopped.';
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
};

const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return new File([blob], filename, { type: mime });
  } catch {
    return null;
  }
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
  const pendingIdleRewindRef = useRef<Map<number, number>>(new Map());
  const lastAutoStoppedEntryIdRef = useRef<number | null>(null);
  const idleStopInFlightRef = useRef(false);

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
      idleStopInFlightRef.current = false;
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
    idleStopInFlightRef.current = false;

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
      if (
        idleSeconds < IDLE_AUTO_STOP_THRESHOLD_SECONDS
        || lastAutoStoppedEntryIdRef.current === activeEntry.id
        || idleStopInFlightRef.current
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
          return true;
        }

        if (status === 409) {
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
          return;
        }
        activeEntryRef.current = activeEntry;

        const { idleSeconds, lastActivityAtMs } = await getIdleState(now);
        const trackedWindowEnd = Math.min(now, Math.max(lastInputRef.current, previousTickAt));
        const trackedSecondsThisTick = Math.max(
          0,
          Math.round((trackedWindowEnd - previousTickAt) / 1000)
        );
        const activeContext = typeof desktopApi.getActiveWindowContext === 'function'
          ? await desktopApi.getActiveWindowContext()
          : null;
        const appName = String(activeContext?.app || '').trim();
        const title = String(activeContext?.title || '').trim();
        const url = String(activeContext?.url || '').trim();
        const isBrowserApp = BROWSER_APP_KEYWORDS.some((keyword) => appName.toLowerCase().includes(keyword));
        const fallbackTitle = typeof document !== 'undefined' ? document.title : '';
        const contextNameBase = url || [appName, title].filter(Boolean).join(' - ') || fallbackTitle || 'Active Input';
        const contextName = contextNameBase.slice(0, 255);
        const recordedAt = new Date(now).toISOString();
        const activityType: 'app' | 'url' = url || isBrowserApp ? 'url' : 'app';

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
              durationSeconds: elapsedSeconds,
              signature,
              kind: 'tracked',
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
        return;
      }

      await attemptIdleAutoStop(activeEntry, idleSeconds, lastActivityAtMs, new Date(now).toISOString());
    };

    const captureScreenshotOnInterval = async () => {
      if (screenshotInFlight || !isCurrentRun()) return;

      screenshotInFlight = true;
      try {
        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) {
          activeEntryRef.current = null;
          return;
        }
        activeEntryRef.current = activeEntry;

        const now = Date.now();
        const { idleSeconds } = await getIdleState(now);
        if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
          return;
        }

        const screenshotDataUrl = await desktopApi.captureScreenshot();
        if (!screenshotDataUrl) {
          return;
        }

        const file = dataUrlToFile(screenshotDataUrl, `capture-${now}.png`);
        if (!file) {
          return;
        }

        await screenshotApi.upload(activeEntry.id, file);
      } catch (error) {
        console.error('Desktop tracker screenshot capture failed:', error);
      } finally {
        screenshotInFlight = false;
      }
    };

    activityIntervalRef.current = setInterval(() => {
      void tick();
    }, ACTIVITY_TRACK_INTERVAL_MS);
    idleGuardIntervalRef.current = setInterval(() => {
      void runIdleGuard();
    }, IDLE_GUARD_INTERVAL_MS);
    screenshotIntervalRef.current = setInterval(() => {
      void captureScreenshotOnInterval();
    }, SCREENSHOT_INTERVAL_MS);
    void tick();

    return () => {
      clearTrackerIntervals();
      if (desktopTrackerRunSequence === runId) {
        desktopTrackerRunSequence += 1;
      }
    };
  }, [isAuthenticated, user, userId]);
};
