/// <reference types="vite/client" />

interface DesktopTrackerBridge {
  captureScreenshot: () => Promise<string | null>;
  getSystemIdleSeconds: () => Promise<number>;
  getActiveWindowContext: () => Promise<{
    app: string | null;
    title: string | null;
    url: string | null;
  } | null>;
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
