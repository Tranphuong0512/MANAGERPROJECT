const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getSavedCredentials: () => ipcRenderer.invoke('get-saved-credentials'),
  saveCredentials: (credentials) => ipcRenderer.invoke('save-credentials', credentials),
  clearSavedCredentials: () => ipcRenderer.invoke('clear-saved-credentials'),
  onUpdateAvailable: (callback) => {
    const handler = (_, info) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_, progress) => callback(progress);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_, info) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  quitAndInstall: () => ipcRenderer.send('quit-and-install')
});
