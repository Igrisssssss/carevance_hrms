import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';

const TRACK_INTERVAL_MS = 30000;
const IDLE_THRESHOLD_SECONDS = 60;
const BROWSER_APP_KEYWORDS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi'];

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

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) return;

        const idleSecondsFromInput = Math.floor((Date.now() - lastInputRef.current) / 1000);
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

        if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
          const idleName = (`System Idle - ${contextName}`).slice(0, 255);
          await activityApi.create({
            time_entry_id: activeEntry.id,
            type: 'idle',
            name: idleName,
            duration: Math.min(idleSeconds, TRACK_INTERVAL_MS / 1000),
            recorded_at: new Date().toISOString(),
          });
        } else {
          const type: 'app' | 'url' = url || isBrowserApp ? 'url' : 'app';

          await activityApi.create({
            time_entry_id: activeEntry.id,
            type,
            name: contextName,
            duration: TRACK_INTERVAL_MS / 1000,
            recorded_at: new Date().toISOString(),
          });
        }

        const screenshotDataUrl = await desktopApi.captureScreenshot();
        if (screenshotDataUrl) {
          const file = dataUrlToFile(screenshotDataUrl, `capture-${Date.now()}.png`);
          if (file) {
            await screenshotApi.upload(activeEntry.id, file);
          }
        }
      } catch (error) {
        console.error('Desktop tracker tick failed:', error);
      } finally {
        inFlight = false;
      }
    };

    // Send first telemetry immediately so monitoring widgets are not empty on startup.
    void tick();
    const interval = setInterval(tick, TRACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role]);
};
