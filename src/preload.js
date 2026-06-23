const { contextBridge, ipcRenderer } = require('electron');

// Expõe API segura para o React (renderer process)
contextBridge.exposeInMainWorld('electronAPI', {
  // Arquivo
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),

  // Auth (token seguro)
  saveToken: (token) => ipcRenderer.invoke('auth:saveToken', token),
  loadToken: () => ipcRenderer.invoke('auth:loadToken'),
  clearToken: () => ipcRenderer.invoke('auth:clearToken'),

  // Utilitários
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  downloadUrl: (url, filename) => ipcRenderer.invoke('download:url', url, filename),

  // Controles da janela (barra de título customizada)
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb) => {
      const handler = (_e, val) => cb(val);
      ipcRenderer.on('window:maximized', handler);
      return () => ipcRenderer.removeListener('window:maximized', handler);
    },
  },
});
