const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, safeStorage, Menu } = require('electron');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Foto Manager — Eita Casa Perfeita',
    icon: path.join(__dirname, '../assets/icon.ico'),
    frame: false,                 // sem moldura nativa — barra de título própria no app
    backgroundColor: '#f3f4f6',   // gray-100, evita flash branco na abertura
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Avisa o renderer quando o estado de maximização muda (atualiza o ícone do botão)
  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5200');
    // DevTools só abre sob demanda (F12 / Ctrl+Shift+I), não automaticamente
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Allowlist: só permitimos ler arquivos que o usuário escolheu no último dialog.
// Impede o renderer de pedir caminhos arbitrários do disco (ex.: ../../.ssh/id_rsa).
const arquivosPermitidos = new Set();
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

// IPC: Abrir dialog de seleção de arquivos (photos)
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    title: 'Selecionar fotos para upload',
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  for (const p of result.filePaths) arquivosPermitidos.add(p);
  return result.filePaths;
});

// IPC: Ler arquivo como buffer (para envio multipart) — só caminhos da allowlist
ipcMain.handle('file:read', async (event, filePath) => {
  if (!arquivosPermitidos.has(filePath)) {
    throw new Error('Arquivo não autorizado para leitura');
  }
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error('Arquivo excede o limite de 50MB');
  }
  const buffer = await fs.promises.readFile(filePath);
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

// IPC: Baixar um arquivo/foto por URL (mostra o diálogo de salvar do sistema).
// filename opcional sugere o nome no diálogo (preserva o nome SEO).
ipcMain.handle('download:url', (event, url, filename) => {
  if (!mainWindow || !url) return;
  if (filename) {
    mainWindow.webContents.session.once('will-download', (e, item) => {
      try { item.setSaveDialogOptions({ defaultPath: filename }); } catch {}
    });
  }
  mainWindow.webContents.downloadURL(url);
});

// IPC: Controles de janela (barra de título customizada)
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
