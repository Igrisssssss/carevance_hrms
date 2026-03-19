const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor, shell } = require('electron');
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
const APP_ICON = process.platform === 'win32'
  ? path.join(__dirname, 'assets', 'icon.ico')
  : path.join(__dirname, 'assets', 'icon.png');
const APP_ID = 'com.carevance.tracker';
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

const createWindow = () => {
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

  mainWindow.loadURL(APP_URL);

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
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  if (!sources.length) return null;
  return sources[0].thumbnail.toDataURL();
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
  createWindow();
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
