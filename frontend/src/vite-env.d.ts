/// <reference types="vite/client" />

interface DesktopTrackerBridge {
  captureScreenshot: () => Promise<string | null>;
  getSystemIdleSeconds: () => Promise<number>;
}

interface Window {
  desktopTracker?: DesktopTrackerBridge;
}
