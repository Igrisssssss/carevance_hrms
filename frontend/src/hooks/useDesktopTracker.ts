import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activityApi, screenshotApi, timeEntryApi } from '@/services/api';

const TRACK_INTERVAL_MS = 60000;
const IDLE_THRESHOLD_SECONDS = 60;

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

    const tick = async () => {
      try {
        const active = await timeEntryApi.active({ timer_slot: 'primary' });
        const activeEntry = active.data;
        if (!activeEntry?.id) return;

        const idleSecondsFromInput = Math.floor((Date.now() - lastInputRef.current) / 1000);
        const idleSecondsSystem = await desktopApi.getSystemIdleSeconds();
        const idleSeconds = Math.max(idleSecondsFromInput, idleSecondsSystem);

        if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
          await activityApi.create({
            time_entry_id: activeEntry.id,
            type: 'idle',
            name: 'System Idle',
            duration: idleSeconds,
            recorded_at: new Date().toISOString(),
          });
        } else {
          await activityApi.create({
            time_entry_id: activeEntry.id,
            type: 'app',
            name: 'Active Input',
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
      }
    };

    const interval = setInterval(tick, TRACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role]);
};
