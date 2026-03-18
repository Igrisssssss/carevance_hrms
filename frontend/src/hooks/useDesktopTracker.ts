import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  emitDesktopTimerIdleStop,
  setIdleAutoStopNotice,
  suppressAutoStart,
} from '@/lib/desktopTimerSession';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';

const ACTIVITY_TRACK_INTERVAL_MS = 5000;
const SCREENSHOT_INTERVAL_MS = 3 * 60 * 1000;
const IDLE_THRESHOLD_SECONDS = 3 * 60;
const IDLE_AUTO_STOP_THRESHOLD_SECONDS = 5 * 60;
const BROWSER_APP_KEYWORDS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi'];
const IDLE_AUTO_STOP_MESSAGE = 'You were idle for 5 minutes, so your timer was stopped.';

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
  const lastScreenshotAtRef = useRef<number>(0);
  const pendingIdleRewindRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const markInput = () => {
      lastInputRef.current = Date.now();
      pendingIdleRewindRef.current.clear();
    };

    window.addEventListener('mousemove', markInput);
    window.addEventListener('keydown', markInput);
    window.addEventListener('mousedown', markInput);

    return () => {
      window.removeEventListener('mousemove', markInput);
      window.removeEventListener('keydown', markInput);
      window.removeEventListener('mousedown', markInput);
    };
  }, []);

  useEffect(() => {
    const isEmployee = user?.role === 'employee';
    const desktopApi = window.desktopTracker;
    if (!isAuthenticated || !isEmployee || !desktopApi) {
      activeSegmentRef.current = null;
      pendingIdleRewindRef.current.clear();
      return;
    }
    let inFlight = false;
    lastTickAtRef.current = Date.now();
    activeSegmentRef.current = null;
    lastScreenshotAtRef.current = Date.now();
    pendingIdleRewindRef.current.clear();

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

    const tick = async () => {
      if (inFlight) return;
      const now = Date.now();
      const elapsedSeconds = Math.max(
        1,
        Math.round((now - (lastTickAtRef.current ?? now)) / 1000)
      );
      lastTickAtRef.current = now;
      inFlight = true;
      try {
        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) {
          activeSegmentRef.current = null;
          return;
        }

        const idleSecondsFromInput = Math.floor((now - lastInputRef.current) / 1000);
        const idleSecondsSystem = await desktopApi.getSystemIdleSeconds();
        const idleSeconds = Math.max(idleSecondsFromInput, idleSecondsSystem);
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
          const idleSignature = `${activeEntry.id}:idle:${lastInputRef.current}`;
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

          if (idleSeconds >= IDLE_AUTO_STOP_THRESHOLD_SECONDS) {
            try {
              await timeEntryApi.stop({
                timer_slot: 'primary',
                auto_stopped_for_idle: true,
                idle_seconds: idleSeconds,
              });
            } catch (error: any) {
              const status = error?.response?.status;
              if (status !== 404) {
                throw error;
              }
            }

            activeSegmentRef.current = null;
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

            return;
          }
        } else {
          const payload = {
            time_entry_id: activeEntry.id,
            type: activityType,
            name: contextName,
            duration: elapsedSeconds,
            recorded_at: recordedAt,
          };
          const signature = `${payload.time_entry_id}:${payload.type}:${payload.name}`;
          const currentSegment = activeSegmentRef.current;

          if (currentSegment?.kind === 'tracked' && currentSegment.signature === signature) {
            const baselineDuration = currentSegment.durationSeconds;
            const nextDuration = baselineDuration + elapsedSeconds;
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

        if (now - lastScreenshotAtRef.current >= SCREENSHOT_INTERVAL_MS) {
          const screenshotDataUrl = await desktopApi.captureScreenshot();
          if (screenshotDataUrl) {
            const file = dataUrlToFile(screenshotDataUrl, `capture-${now}.png`);
            if (file) {
              await screenshotApi.upload(activeEntry.id, file);
            }
          }
          lastScreenshotAtRef.current = now;
        }
      } catch (error) {
        console.error('Desktop tracker tick failed:', error);
      } finally {
        inFlight = false;
      }
    };

    const interval = setInterval(() => {
      void tick();
    }, ACTIVITY_TRACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role, userId]);
};
