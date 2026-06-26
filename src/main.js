const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, safeStorage, Menu } = require('electron');

// Squirrel.Windows: na instalação/atualização/desinstalação ele roda o app com flags
// especiais (cria/remove atalhos). Esse guard trata isso e sai sem abrir a janela.
if (require('electron-squirrel-startup')) { app.quit(); }

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Guarda o último status de atualização para o renderer consultar ao montar
// (evita perder o evento quando o React ainda não estava ouvindo).
let lastUpdateStatus = { state: 'none' };

// Auto-update (Squirrel.Windows): checa um feed no servidor, baixa em segundo plano
// e aplica no próximo restart. Só em produção (empacotado) e no Windows.
function configurarAutoUpdate() {
  if (isDev || process.platform !== 'win32') return;
  try {
    const { autoUpdater } = require('electron');
    // GitHub Releases via update.electronjs.org (CDN rápido). Repo público.
    const repo = 'tecnologia-eita/foto-manager-app';
    const base = process.env.UPDATE_FEED_URL || `https://update.electronjs.org/${repo}/win32/${app.getVersion()}`;
    const status = (s) => { lastUpdateStatus = s; try { mainWindow?.webContents.send('update:status', s); } catch {} };
    autoUpdater.setFeedURL({ url: base });
    autoUpdater.on('checking-for-update', () => status({ state: 'checking' }));
    autoUpdater.on('update-available', () => status({ state: 'downloading' }));
    autoUpdater.on('update-not-available', () => status({ state: 'none' }));
    autoUpdater.on('update-downloaded', (_e, _notes, name) => status({ state: 'ready', version: name }));
    autoUpdater.on('error', err => { console.error('[autoUpdate]', err?.message || err); status({ state: 'error' }); });
    autoUpdater.checkForUpdates();
    setInterval(() => { try { autoUpdater.checkForUpdates(); } catch {} }, 6 * 60 * 60 * 1000); // a cada 6h
  } catch (err) {
    console.error('[autoUpdate] falha ao configurar:', err?.message || err);
  }
}

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
  configurarAutoUpdate();
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

// ===== VÍDEO: baixa do YouTube na máquina do usuário (IP residencial não é bloqueado)
// e envia o arquivo pro backend → Drive. O yt-dlp.exe é baixado sob demanda (não embute no app).
const https = require('https');

function baixarHttps(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error('muitos redirects'));
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'FotoManager' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        file.close(); fs.unlink(destPath, () => {});
        return resolve(baixarHttps(resp.headers.location, destPath, redirects + 1));
      }
      if (resp.statusCode !== 200) { file.close(); fs.unlink(destPath, () => {}); return reject(new Error('HTTP ' + resp.statusCode)); }
      resp.pipe(file);
      file.on('finish', () => file.close(() => resolve(destPath)));
    }).on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
  });
}

const YTDLP_PATH = path.join(app.getPath('userData'), 'bin', 'yt-dlp.exe');
async function ensureYtDlp(onStatus) {
  try { if (fs.existsSync(YTDLP_PATH) && fs.statSync(YTDLP_PATH).size > 1_000_000) return YTDLP_PATH; } catch {}
  fs.mkdirSync(path.dirname(YTDLP_PATH), { recursive: true });
  onStatus?.('Preparando o baixador de vídeo (primeira vez)…');
  await baixarHttps('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', YTDLP_PATH);
  return YTDLP_PATH;
}

async function enviarVideoBackend({ apiUrl, token, produtoId, filePath, nome, origem }) {
  const buf = fs.readFileSync(filePath);
  const fd = new FormData();
  fd.append('video', new Blob([buf], { type: 'video/mp4' }), nome || 'video.mp4');
  fd.append('origem', origem || 'upload');
  if (nome) fd.append('nome', nome);
  const r = await fetch(`${apiUrl}/api/video/${produtoId}/upload`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

// Extrai o ID do vídeo de qualquer forma de URL do YouTube (embed/watch/youtu.be)
function youtubeId(url) {
  const m = String(url || '').match(/(?:embed\/|v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Baixa um vídeo do YouTube e envia pro backend
ipcMain.handle('video:importarYoutube', async (event, { produtoId, youtubeUrl, apiUrl, token }) => {
  const { execFile } = require('child_process');
  const send = (m) => { try { mainWindow?.webContents.send('video:status', m); } catch {} };
  try {
    const ytdlp = await ensureYtDlp(send);
    const id = youtubeId(youtubeUrl);
    const url = id ? `https://www.youtube.com/watch?v=${id}` : youtubeUrl; // watch é mais confiável que embed
    const out = path.join(app.getPath('temp'), `fm-video-${Date.now()}.mp4`);
    send('Baixando o vídeo do YouTube…');
    await new Promise((resolve, reject) => {
      // formato progressivo (áudio+vídeo num arquivo só) → não precisa de ffmpeg
      execFile(ytdlp, ['-f', 'best[ext=mp4][acodec!=none][vcodec!=none]/best[ext=mp4]/best',
        '--no-playlist', '--no-warnings', '-o', out, url],
        { timeout: 300000, maxBuffer: 20 * 1024 * 1024 }, (err, so, se) => {
          if (err) {
            const raw = (se || err.message || '');
            let msg = raw.split('\n').filter(l => /ERROR/i.test(l)).slice(-1)[0] || raw.split('\n').filter(Boolean).slice(-1)[0] || 'falha no download';
            if (/not available|DRM|unavailable|private|format is not available/i.test(raw)) {
              msg = 'Esse vídeo do YouTube está indisponível/restrito para download. Use "Adicionar vídeo" e envie o arquivo.';
            }
            return reject(new Error(msg.replace(/^ERROR:\s*/i, '').slice(0, 220)));
          }
          resolve();
        });
    });
    send('Enviando o vídeo pro Drive…');
    const data = await enviarVideoBackend({ apiUrl, token, produtoId, filePath: out, nome: 'video-youtube.mp4', origem: 'youtube' });
    fs.unlink(out, () => {});
    send('');
    return data;
  } catch (e) { send(''); throw e; }
});

// Seleciona um arquivo de vídeo do disco e envia pro backend
ipcMain.handle('video:selecionarEUpload', async (event, { produtoId, apiUrl, token }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Vídeos', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'] }],
    title: 'Selecionar vídeo do produto',
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const fp = result.filePaths[0];
  const send = (m) => { try { mainWindow?.webContents.send('video:status', m); } catch {} };
  send('Enviando o vídeo pro Drive…');
  try {
    const data = await enviarVideoBackend({ apiUrl, token, produtoId, filePath: fp, nome: path.basename(fp), origem: 'upload' });
    send('');
    return data;
  } catch (e) { send(''); throw e; }
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

// Reinicia e aplica a atualização baixada (Squirrel)
ipcMain.handle('update:restart', () => {
  try { require('electron').autoUpdater.quitAndInstall(); } catch (err) { console.error('[autoUpdate] restart', err); }
});
// Status atual da atualização (renderer consulta ao montar)
ipcMain.handle('update:getStatus', () => lastUpdateStatus);
