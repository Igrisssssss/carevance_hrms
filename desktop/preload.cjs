const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopTracker', {
  captureScreenshot: () => ipcRenderer.invoke('desktop:capture-screenshot'),
  getSystemIdleSeconds: () => ipcRenderer.invoke('desktop:get-system-idle-seconds'),
  getActiveWindowContext: () => ipcRenderer.invoke('desktop:get-active-window-context'),
  revealWindow: () => ipcRenderer.invoke('desktop:reveal-window'),
  showNotification: (payload) => ipcRenderer.invoke('desktop:show-notification', payload),
  getUpdateState: () => ipcRenderer.invoke('desktop:get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('desktop:download-update'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  onUpdateState: (callback) => {
    const listener = (_event, payload) => {
      callback(payload);
    };
    ipcRenderer.on('desktop:update-state', listener);
    return () => {
      ipcRenderer.removeListener('desktop:update-state', listener);
    };
  },
  clearUpdateStateListeners: () => {
    ipcRenderer.removeAllListeners('desktop:update-state');
  },
  onNotificationClicked: (callback) => {
    const listener = (_event, payload) => {
      callback(payload);
    };
    ipcRenderer.on('desktop:notification-clicked', listener);
    return () => {
      ipcRenderer.removeListener('desktop:notification-clicked', listener);
    };
  },
  clearNotificationClickListeners: () => {
    ipcRenderer.removeAllListeners('desktop:notification-clicked');
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
