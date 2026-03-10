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

interface Window {
  desktopTracker?: DesktopTrackerBridge;
}
