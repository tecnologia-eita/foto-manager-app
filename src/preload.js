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
});
