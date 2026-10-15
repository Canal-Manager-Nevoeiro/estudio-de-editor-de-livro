const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { EditorialDatabase } = require('./database.cjs');

app.setName('Studio Editorial');
if (process.env.LOCALAPPDATA) app.setPath('userData', path.join(process.env.LOCALAPPDATA, 'StudioEditorial'));

const appRoot = app.getAppPath();
const logDirectory = path.join(app.getPath('userData'), 'logs');
fs.mkdirSync(logDirectory, { recursive: true });
function log(level, message, error) {
  const line = `${new Date().toISOString()} [${level}] ${message}${error ? `: ${String(error.message || error)}` : ''}\n`;
  try { fs.appendFileSync(path.join(logDirectory, `${new Date().toISOString().slice(0, 10)}.log`), line); } catch { /* logging must not block startup */ }
}

const database = new EditorialDatabase({
  databasePath: path.join(app.getPath('userData'), 'data', 'studio-editorial.sqlite'),
  backupDirectory: path.join(app.getPath('userData'), 'backups'),
  wasmPath: path.join(appRoot, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  log,
});

function assertTrustedSender(event) {
  const frameUrl = event.senderFrame?.url || '';
  const isPackaged = app.isPackaged && frameUrl.startsWith(pathToFileURL(path.join(appRoot, 'dist')).href);
  const isDev = !app.isPackaged && /^http:\/\/127\.0\.0\.1:3000\//.test(frameUrl);
  if (!isPackaged && !isDev) throw new Error('Origem IPC não autorizada.');
}
function guarded(handler) {
  return async (event, ...args) => {
    try { assertTrustedSender(event); return await handler(...args); }
    catch (error) { log('error', 'Falha em operação local do aplicativo.', error); throw error; }
  };
}

function registerIpc() {
  ipcMain.handle('storage:initialize', guarded((payload) => database.open(payload)));
  ipcMain.handle('storage:list', guarded(() => database.getProjects()));
  ipcMain.handle('storage:save', guarded((project) => database.saveProject(project)));
  ipcMain.handle('storage:save-all', guarded((projects) => database.saveProjects(projects)));
  ipcMain.handle('storage:delete', guarded((id) => database.deleteProject(id)));
  ipcMain.handle('storage:active:get', guarded(() => database.getPreference('activeProjectId', '')));
  ipcMain.handle('storage:active:set', guarded((id) => database.setActiveProjectId(id)));
  ipcMain.handle('storage:path', guarded(() => database.databasePath));
  ipcMain.handle('file:save', guarded(async ({ name, data }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: name });
    if (canceled || !filePath) return false;
    const bytes = typeof data === 'string' ? Buffer.from(data, 'base64') : Buffer.from(data);
    fs.writeFileSync(filePath, bytes);
    return true;
  }));
  ipcMain.handle('export:pdf', guarded(async ({ html, name }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: name, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (canceled || !filePath) return false;
    const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    const tempPath = path.join(app.getPath('temp'), `studio-editorial-${Date.now()}.html`);
    try {
      const safeHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<head([^>]*)>/i, '<head$1><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; font-src data:; style-src \'unsafe-inline\'">');
      fs.writeFileSync(tempPath, safeHtml, 'utf8');
      await printWindow.loadFile(tempPath);
      const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
      fs.writeFileSync(filePath, pdf);
      return true;
    } finally {
      printWindow.destroy();
      fs.rmSync(tempPath, { force: true });
    }
  }));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 1100, minHeight: 720,
    backgroundColor: '#0c0d0e',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => log('error', `Falha ao carregar interface (${code}) em ${url}`, new Error(description)));
  win.webContents.on('did-finish-load', () => log('info', `Interface carregada: ${win.webContents.getURL()}`));
  win.webContents.on('render-process-gone', (_event, details) => log('error', `Processo da interface encerrado (${details.reason})`));
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) log('error', `Erro na interface: ${message}`); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = app.isPackaged ? url.startsWith(pathToFileURL(path.join(appRoot, 'dist')).href) : /^http:\/\/127\.0\.0\.1:3000\//.test(url);
    if (!allowed) event.preventDefault();
  });
  if (app.isPackaged) win.loadFile(path.join(appRoot, 'dist', 'index.html'));
  else win.loadURL('http://127.0.0.1:3000');
}

app.whenReady().then(async () => {
  try {
    registerIpc();
    createWindow();
  } catch (error) { log('error', 'Falha ao iniciar o aplicativo', error); dialog.showErrorBox('Studio Editorial', 'Não foi possível iniciar o armazenamento local. Os arquivos existentes foram preservados.'); }
});
app.on('before-quit', () => { try { database.close(); } catch (error) { log('error', 'Falha ao concluir gravação local', error); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
