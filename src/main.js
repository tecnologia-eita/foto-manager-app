const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Foto Manager — Eita Casa Perfeita',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Abrir dialog de seleção de arquivos (photos)
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    title: 'Selecionar fotos para upload',
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return result.filePaths;
});

// IPC: Ler arquivo como buffer (para envio multipart)
ipcMain.handle('file:read', async (event, filePath) => {
  const buffer = fs.readFileSync(filePath);
  return { buffer: buffer.toString('base64'), name: path.basename(filePath) };
});

// IPC: Salvar/carregar token JWT de forma segura
const TOKEN_FILE = path.join(app.getPath('userData'), 'session.enc');

ipcMain.handle('auth:saveToken', async (event, token) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(TOKEN_FILE, safeStorage.encryptString(token));
    } else {
      fs.writeFileSync(TOKEN_FILE, token); // fallback sem criptografia
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('auth:loadToken', async () => {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const raw = fs.readFileSync(TOKEN_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw);
    }
    return raw.toString();
  } catch {
    return null;
  }
});

ipcMain.handle('auth:clearToken', async () => {
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  return { ok: true };
});

// IPC: Abrir URL no navegador padrão
ipcMain.handle('shell:openExternal', (event, url) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});
