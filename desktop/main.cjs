const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor, shell } = require('electron');
const path = require('path');
let activeWin = null;

try {
  activeWin = require('active-win');
} catch {
  activeWin = null;
}

const DEFAULT_APP_URL = 'http://localhost:5173';
const APP_URL = process.env.APP_URL || DEFAULT_APP_URL;
const APP_ICON = process.platform === 'win32'
  ? path.join(__dirname, 'assets', 'icon.ico')
  : path.join(__dirname, 'assets', 'icon.png');
const APP_ID = 'com.carevance.tracker';
let mainWindow = null;

app.setName('CareVance Tracker');

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
