const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopTracker', {
  captureScreenshot: () => ipcRenderer.invoke('desktop:capture-screenshot'),
  getSystemIdleSeconds: () => ipcRenderer.invoke('desktop:get-system-idle-seconds'),
  getActiveWindowContext: () => ipcRenderer.invoke('desktop:get-active-window-context'),
});
