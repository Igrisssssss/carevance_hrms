type AppRuntimeConfig = {
  VITE_API_URL?: string;
  VITE_WEB_APP_URL?: string;
  VITE_DESKTOP_DOWNLOAD_URL?: string;
  VITE_DESKTOP_DOWNLOAD_LABEL?: string;
};

const runtimeConfig: AppRuntimeConfig =
  typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {};

const resolveConfigValue = (runtimeValue?: string, buildValue?: string) => {
  const runtimeCandidate = runtimeValue?.trim();
  if (runtimeCandidate) {
    return runtimeCandidate;
  }

  const buildCandidate = buildValue?.trim();
  if (buildCandidate) {
    return buildCandidate;
  }

  return '';
};

export const apiUrl = resolveConfigValue(runtimeConfig.VITE_API_URL, import.meta.env.VITE_API_URL) || 'http://localhost:8000/api';

export const apiBaseUrl = apiUrl.replace(/\/api\/?$/, '');

export const webAppUrl =
  resolveConfigValue(runtimeConfig.VITE_WEB_APP_URL, import.meta.env.VITE_WEB_APP_URL) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

export const desktopDownloadUrl =
  resolveConfigValue(runtimeConfig.VITE_DESKTOP_DOWNLOAD_URL, import.meta.env.VITE_DESKTOP_DOWNLOAD_URL) ||
  `${apiBaseUrl}/api/downloads/desktop/windows`;

export const desktopDownloadLabel =
  resolveConfigValue(runtimeConfig.VITE_DESKTOP_DOWNLOAD_LABEL, import.meta.env.VITE_DESKTOP_DOWNLOAD_LABEL) ||
  'Download for Windows';
