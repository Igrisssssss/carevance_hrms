/// <reference types="vite/client" />

interface DesktopUpdateState {
  enabled: boolean;
  status: 'disabled' | 'idle' | 'checking' | 'available' | 'current' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  message: string;
  releaseNotes: string;
  releaseDate: string | null;
  availableVersion: string | null;
  downloadedVersion: string | null;
  progressPercent: number;
}

interface DesktopTrackerBridge {
  captureScreenshot: () => Promise<string | null>;
  getSystemIdleSeconds: () => Promise<number>;
  getActiveWindowContext: () => Promise<{
    app: string | null;
    title: string | null;
    url: string | null;
  } | null>;
  revealWindow: () => Promise<boolean>;
  getUpdateState?: () => Promise<DesktopUpdateState>;
  checkForUpdates?: () => Promise<DesktopUpdateState>;
  downloadUpdate?: () => Promise<DesktopUpdateState>;
  installUpdate?: () => Promise<boolean>;
  onUpdateState?: (callback: (state: DesktopUpdateState) => void) => void;
  clearUpdateStateListeners?: () => void;
  onPrepareForClose?: (callback: () => void | Promise<void>) => void;
  clearPrepareForCloseListeners?: () => void;
  confirmCloseReady?: () => Promise<boolean>;
}

interface AppRuntimeConfig {
  VITE_API_URL?: string;
  VITE_WEB_APP_URL?: string;
  VITE_DESKTOP_DOWNLOAD_URL?: string;
  VITE_DESKTOP_DOWNLOAD_LABEL?: string;
}

interface Window {
  desktopTracker?: DesktopTrackerBridge;
  __APP_CONFIG__?: AppRuntimeConfig;
}
