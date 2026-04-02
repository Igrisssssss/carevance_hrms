const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { NsisUpdater } = require('electron-updater');
let activeWin = null;

try {
  activeWin = require('active-win');
} catch {
  activeWin = null;
}

const DEFAULT_APP_URL = 'http://localhost:5173';
const readConfiguredAppConfig = () => {
  try {
    const configPath = path.join(__dirname, 'app-config.json');
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};
const APP_CONFIG = readConfiguredAppConfig();
const APP_URL = process.env.APP_URL || (typeof APP_CONFIG.appUrl === 'string' ? APP_CONFIG.appUrl.trim() : '') || DEFAULT_APP_URL;
const IS_REMOTE_APP_URL = /^https?:\/\//i.test(APP_URL);
const APP_ICON = process.platform === 'win32'
  ? path.join(__dirname, 'assets', 'icon.ico')
  : path.join(__dirname, 'assets', 'icon.png');
const APP_ID = 'com.carevance.tracker';
const DEFAULT_SCREENSHOT_MAX_WIDTH = 1920;
const DEFAULT_SCREENSHOT_MAX_HEIGHT = 1080;
const DEFAULT_SCREENSHOT_JPEG_QUALITY = 82;
let mainWindow = null;
let allowWindowClose = false;
let closePreparationInProgress = false;
let closePreparationTimeout = null;
let autoUpdater = null;
let updateCheckInterval = null;
let updateState = {
  enabled: false,
  status: 'disabled',
  currentVersion: app.getVersion(),
  message: 'Automatic updates are not configured.',
  releaseNotes: '',
  releaseDate: null,
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: 0,
};

app.setName('CareVance Tracker');

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

const parseIntEnv = (key, fallback, min, max) => {
  const parsed = Number.parseInt(String(process.env[key] || ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const SCREENSHOT_MAX_WIDTH = parseIntEnv('DESKTOP_SCREENSHOT_MAX_WIDTH', DEFAULT_SCREENSHOT_MAX_WIDTH, 640, 4096);
const SCREENSHOT_MAX_HEIGHT = parseIntEnv('DESKTOP_SCREENSHOT_MAX_HEIGHT', DEFAULT_SCREENSHOT_MAX_HEIGHT, 360, 2160);
const SCREENSHOT_JPEG_QUALITY = parseIntEnv('DESKTOP_SCREENSHOT_JPEG_QUALITY', DEFAULT_SCREENSHOT_JPEG_QUALITY, 60, 95);

const buildScreenshotCaptureAttempts = () => {
  const primaryDisplaySize = screen.getPrimaryDisplay()?.size || { width: SCREENSHOT_MAX_WIDTH, height: SCREENSHOT_MAX_HEIGHT };
  const cappedWidth = Math.max(640, Math.min(primaryDisplaySize.width, SCREENSHOT_MAX_WIDTH));
  const cappedHeight = Math.max(360, Math.min(primaryDisplaySize.height, SCREENSHOT_MAX_HEIGHT));
  const attempts = [
    { width: cappedWidth, height: cappedHeight },
    { width: Math.max(1280, Math.floor(cappedWidth * 0.85)), height: Math.max(720, Math.floor(cappedHeight * 0.85)) },
    { width: 1280, height: 720 },
  ];

  const uniqueBySize = new Map();
  for (const attempt of attempts) {
    uniqueBySize.set(`${attempt.width}x${attempt.height}`, attempt);
  }

  return Array.from(uniqueBySize.values());
};

const resolvePreferredDisplayId = () => {
  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const nearestDisplay = screen.getDisplayNearestPoint(cursorPoint);
    if (nearestDisplay?.id !== undefined && nearestDisplay?.id !== null) {
      return String(nearestDisplay.id);
    }
  } catch {
    // Best-effort only.
  }

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay?.id !== undefined && primaryDisplay?.id !== null) {
      return String(primaryDisplay.id);
    }
  } catch {
    // Best-effort only.
  }

  return null;
};

const pickBestScreenSource = (sources, preferredDisplayId) => {
  const nonEmptySources = sources.filter((source) => source?.thumbnail && !source.thumbnail.isEmpty());
  if (!nonEmptySources.length) {
    return null;
  }

  if (preferredDisplayId) {
    const preferredSource = nonEmptySources.find((source) => String(source.display_id || '') === preferredDisplayId);
    if (preferredSource) {
      return preferredSource;
    }
  }

  const primaryDisplayId = String(screen.getPrimaryDisplay()?.id ?? '');
  if (primaryDisplayId !== '') {
    const primarySource = nonEmptySources.find((source) => String(source.display_id || '') === primaryDisplayId);
    if (primarySource) {
      return primarySource;
    }
  }

  return nonEmptySources
    .slice()
    .sort((left, right) => {
      const leftSize = left.thumbnail.getSize();
      const rightSize = right.thumbnail.getSize();

      return (rightSize.width * rightSize.height) - (leftSize.width * leftSize.height);
    })[0];
};

const thumbnailToDataUrl = (thumbnail) => {
  if (!thumbnail || thumbnail.isEmpty()) {
    return null;
  }

  try {
    const jpegBuffer = thumbnail.toJPEG(SCREENSHOT_JPEG_QUALITY);
    if (jpegBuffer?.length) {
      return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
    }
  } catch {
    // Fall through to PNG encoding if JPEG conversion fails.
  }

  try {
    return thumbnail.toDataURL();
  } catch {
    return null;
  }
};

const resolveUpdateConfig = () => {
  const configuredUpdate = APP_CONFIG.update && typeof APP_CONFIG.update === 'object'
    ? APP_CONFIG.update
    : null;
  const provider = String(process.env.DESKTOP_UPDATE_PROVIDER || configuredUpdate?.provider || '').trim().toLowerCase();
  const owner = String(process.env.DESKTOP_UPDATE_OWNER || configuredUpdate?.owner || '').trim();
  const repo = String(process.env.DESKTOP_UPDATE_REPO || configuredUpdate?.repo || '').trim();
  const url = String(process.env.DESKTOP_UPDATE_URL || configuredUpdate?.url || '').trim();

  if ((provider === 'github' || (!provider && owner && repo)) && owner && repo) {
    return {
      provider: 'github',
      owner,
      repo,
    };
  }

  if ((provider === 'generic' || (!provider && url)) && url) {
    return {
      provider: 'generic',
      url,
    };
  }

  return null;
};

const normalizeReleaseNotes = (releaseNotes) => {
  if (!releaseNotes) {
    return '';
  }

  if (typeof releaseNotes === 'string') {
    return releaseNotes.trim();
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((note) => {
        if (!note) {
          return '';
        }

        const versionHeading = typeof note.version === 'string' && note.version.trim()
          ? `Version ${note.version.trim()}`
          : '';
        const noteBody = typeof note.note === 'string' ? note.note.trim() : '';
        return [versionHeading, noteBody].filter(Boolean).join('\n');
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
};

const broadcastUpdateState = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('desktop:update-state', updateState);
};

const setUpdateState = (patch) => {
  updateState = {
    ...updateState,
    ...patch,
    currentVersion: app.getVersion(),
  };
  broadcastUpdateState();
};

const proceedToCloseWindow = () => {
  if (closePreparationTimeout) {
    clearTimeout(closePreparationTimeout);
    closePreparationTimeout = null;
  }

  closePreparationInProgress = false;

  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  allowWindowClose = true;
  mainWindow.close();
  return true;
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (app.isPackaged && IS_REMOTE_APP_URL) {
    try {
      await mainWindow.webContents.session.clearCache();
    } catch {
      // Best-effort cache clearing to avoid stale chunk files after web deployments.
    }
  }

  await mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastUpdateState();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (allowWindowClose) {
      return;
    }

    event.preventDefault();

    if (closePreparationInProgress) {
      return;
    }

    closePreparationInProgress = true;

    try {
      mainWindow.webContents.send('desktop:prepare-close');
    } catch {
      proceedToCloseWindow();
      return;
    }

    closePreparationTimeout = setTimeout(() => {
      proceedToCloseWindow();
    }, 2500);
  });

  mainWindow.on('closed', () => {
    if (closePreparationTimeout) {
      clearTimeout(closePreparationTimeout);
      closePreparationTimeout = null;
    }
    allowWindowClose = false;
    closePreparationInProgress = false;
    mainWindow = null;
  });
};

const revealMainWindow = () => {
  const targetWindow = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow
    : BrowserWindow.getAllWindows()[0];

  if (!targetWindow) {
    return false;
  }

  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }

  if (targetWindow.isFullScreen()) {
    targetWindow.setFullScreen(false);
  }

  if (!targetWindow.isMaximized()) {
    targetWindow.maximize();
  }

  if (!targetWindow.isVisible()) {
    targetWindow.show();
  }

  targetWindow.setSkipTaskbar(false);
  targetWindow.setFocusable(true);
  targetWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  targetWindow.flashFrame(true);

  const bringToFront = () => {
    if (targetWindow.isDestroyed()) {
      return;
    }

    app.focus();
    targetWindow.show();
    if (typeof targetWindow.moveTop === 'function') {
      targetWindow.moveTop();
    }
    targetWindow.focus();
    targetWindow.webContents.focus();
  };

  bringToFront();
  setTimeout(bringToFront, 150);
  setTimeout(bringToFront, 500);

  setTimeout(() => {
    if (!targetWindow.isDestroyed()) {
      targetWindow.setAlwaysOnTop(false);
      targetWindow.flashFrame(false);
    }
  }, 3000);

  return true;
};

const checkForDesktopUpdates = async () => {
  if (!autoUpdater) {
    return null;
  }

  return autoUpdater.checkForUpdates();
};

const initializeAutoUpdater = () => {
  const updaterConfig = resolveUpdateConfig();

  if (!app.isPackaged) {
    setUpdateState({
      enabled: false,
      status: 'disabled',
      message: 'Automatic updates are disabled in development builds.',
    });
    return;
  }

  if (process.platform !== 'win32') {
    setUpdateState({
      enabled: false,
      status: 'disabled',
      message: 'Automatic updates are currently enabled only for Windows desktop builds.',
    });
    return;
  }

  if (!updaterConfig) {
    setUpdateState({
      enabled: false,
      status: 'disabled',
      message: 'Automatic updates are not configured for this desktop build.',
    });
    return;
  }

  autoUpdater = new NsisUpdater(updaterConfig);
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.fullChangelog = true;

  setUpdateState({
    enabled: true,
    status: 'idle',
    message: 'Updates are ready to check.',
  });

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      status: 'checking',
      message: 'Checking for desktop updates...',
      progressPercent: 0,
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      status: 'available',
      message: `Version ${info.version} is available.`,
      availableVersion: info.version || null,
      downloadedVersion: null,
      releaseDate: info.releaseDate || null,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      progressPercent: 0,
    });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdateState({
      status: 'current',
      message: 'You are already on the latest desktop version.',
      availableVersion: null,
      downloadedVersion: null,
      releaseDate: null,
      releaseNotes: '',
      progressPercent: 0,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({
      status: 'downloading',
      message: `Downloading update ${Math.round(progress.percent || 0)}%`,
      progressPercent: Number(progress.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      message: `Version ${info.version} is ready to install.`,
      availableVersion: info.version || null,
      downloadedVersion: info.version || null,
      releaseDate: info.releaseDate || null,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      progressPercent: 100,
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdateState({
      status: 'error',
      message: error?.message || 'Unable to check for desktop updates.',
      progressPercent: 0,
    });
  });

  setTimeout(() => {
    void checkForDesktopUpdates();
  }, 15000);

  updateCheckInterval = setInterval(() => {
    void checkForDesktopUpdates();
  }, 30 * 60 * 1000);
};

ipcMain.handle('desktop:capture-screenshot', async () => {
  const preferredDisplayId = resolvePreferredDisplayId();
  const attempts = buildScreenshotCaptureAttempts();

  for (const attempt of attempts) {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: attempt.width, height: attempt.height },
    });

    if (!sources.length) {
      continue;
    }

    const bestSource = pickBestScreenSource(sources, preferredDisplayId);
    const dataUrl = thumbnailToDataUrl(bestSource?.thumbnail || null);
    if (dataUrl) {
      return dataUrl;
    }
  }

  console.warn('[desktop-tracker] screenshot capture returned no usable source', {
    preferredDisplayId,
    attempts,
  });

  return null;
});

ipcMain.handle('desktop:get-system-idle-seconds', async () => {
  return powerMonitor.getSystemIdleTime();
});

ipcMain.handle('desktop:get-active-window-context', async () => {
  if (!activeWin) {
    return null;
  }

  try {
    const context = await activeWin();
    if (!context) return null;

    return {
      app: context.owner?.name || null,
      title: context.title || null,
      url: context.url || null,
    };
  } catch {
    return null;
  }
});

ipcMain.handle('desktop:reveal-window', async () => {
  return revealMainWindow();
});

ipcMain.handle('desktop:confirm-close-ready', async () => {
  return proceedToCloseWindow();
});

ipcMain.handle('desktop:get-update-state', async () => {
  return updateState;
});

ipcMain.handle('desktop:check-for-updates', async () => {
  await checkForDesktopUpdates();
  return updateState;
});

ipcMain.handle('desktop:download-update', async () => {
  if (!autoUpdater) {
    throw new Error('Automatic updates are not configured.');
  }

  await autoUpdater.downloadUpdate();
  return updateState;
});

ipcMain.handle('desktop:install-update', async () => {
  if (!autoUpdater) {
    throw new Error('Automatic updates are not configured.');
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return true;
});

app.whenReady().then(() => {
  void createWindow();
  initializeAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
});
