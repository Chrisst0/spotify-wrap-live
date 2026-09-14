const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    signIn: () => ipcRenderer.invoke('auth:signIn'),
    checkAuth: () => ipcRenderer.invoke('auth:status'),
    getStats: () => ipcRenderer.invoke('stats:getSummary'),
});
