import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';

const ACTIVITY_TRACK_INTERVAL_MS = 5000;
const SCREENSHOT_INTERVAL_MS = 3 * 60 * 1000;
const IDLE_THRESHOLD_SECONDS = 3 * 60;
const BROWSER_APP_KEYWORDS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi'];

type ActiveSegment = {
  activityId: number;
  durationSeconds: number;
  signature: string;
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
  const lastInputRef = useRef<number>(Date.now());
  const lastTickAtRef = useRef<number | null>(null);
  const activeSegmentRef = useRef<ActiveSegment | null>(null);
  const lastScreenshotAtRef = useRef<number>(0);

  useEffect(() => {
    const markInput = () => {
      lastInputRef.current = Date.now();
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
      return;
    }
    let inFlight = false;
    lastTickAtRef.current = Date.now();
    activeSegmentRef.current = null;
    lastScreenshotAtRef.current = Date.now();

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
        const payload = idleSeconds >= IDLE_THRESHOLD_SECONDS
          ? {
              time_entry_id: activeEntry.id,
              type: 'idle' as const,
              name: (`System Idle - ${contextName}`).slice(0, 255),
              duration: elapsedSeconds,
              recorded_at: recordedAt,
            }
          : {
              time_entry_id: activeEntry.id,
              type: activityType,
              name: contextName,
              duration: elapsedSeconds,
              recorded_at: recordedAt,
            };
        const signature = `${payload.time_entry_id}:${payload.type}:${payload.name}`;
        const currentSegment = activeSegmentRef.current;

        if (currentSegment && currentSegment.signature === signature) {
          const nextDuration = currentSegment.durationSeconds + elapsedSeconds;
          await activityApi.update(currentSegment.activityId, {
            duration: nextDuration,
            recorded_at: recordedAt,
          });
          currentSegment.durationSeconds = nextDuration;
        } else {
          const response = await activityApi.create(payload);
          activeSegmentRef.current = {
            activityId: response.data.id,
            durationSeconds: elapsedSeconds,
            signature,
          };
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
  }, [isAuthenticated, user?.role]);
};
