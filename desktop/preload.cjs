const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopTracker', {
  captureScreenshot: () => ipcRenderer.invoke('desktop:capture-screenshot'),
  getSystemIdleSeconds: () => ipcRenderer.invoke('desktop:get-system-idle-seconds'),
  getActiveWindowContext: () => ipcRenderer.invoke('desktop:get-active-window-context'),
  revealWindow: () => ipcRenderer.invoke('desktop:reveal-window'),
  getUpdateState: () => ipcRenderer.invoke('desktop:get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('desktop:download-update'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  onUpdateState: (callback) => {
    ipcRenderer.removeAllListeners('desktop:update-state');
    ipcRenderer.on('desktop:update-state', (_event, payload) => {
      callback(payload);
    });
  },
  clearUpdateStateListeners: () => {
    ipcRenderer.removeAllListeners('desktop:update-state');
  },
  onPrepareForClose: (callback) => {
    ipcRenderer.removeAllListeners('desktop:prepare-close');
    ipcRenderer.on('desktop:prepare-close', () => {
      void callback();
    });
  },
  clearPrepareForCloseListeners: () => {
    ipcRenderer.removeAllListeners('desktop:prepare-close');
  },
  confirmCloseReady: () => ipcRenderer.invoke('desktop:confirm-close-ready'),
});
