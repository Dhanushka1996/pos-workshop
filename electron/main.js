/**
 * Electron Main Process
 * ─────────────────────
 * Wraps the Next.js app in a native desktop window.
 *
 * SETUP (one-time):
 *   npm install --save-dev electron electron-builder
 *   Add to package.json scripts:
 *     "electron:dev":   "electron electron/main.js"
 *     "electron:build": "electron-builder"
 *
 * Then add to package.json at root level:
 *   "main": "electron/main.js"
 *   "build": { "appId": "com.yourshop.pos", "productName": "POS Workshop", ... }
 */

const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { execSync, spawn } = require('child_process');
const path  = require('path');
const http  = require('http');

const ROOT   = path.resolve(__dirname, '..');
const PORT   = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let nextServer = null;

// ── Start Next.js server ───────────────────────────────────────────────────
async function startNextServer() {
  return new Promise((resolve, reject) => {
    console.log('[Electron] Starting Next.js server…');

    // Run migrations before starting
    try {
      execSync('npx prisma migrate deploy', { cwd: ROOT, stdio: 'pipe' });
    } catch {
      try {
        execSync('npx prisma db push --skip-generate', { cwd: ROOT, stdio: 'pipe' });
      } catch {}
    }

    if (IS_DEV) {
      // In dev, assume Next.js is already running
      resolve();
      return;
    }

    nextServer = spawn('node', ['scripts/start.js', '--no-backup'], {
      cwd:   ROOT,
      stdio: 'pipe',
      env:   { ...process.env, PORT: String(PORT) },
    });

    nextServer.stdout.on('data', d => process.stdout.write(d));
    nextServer.stderr.on('data', d => process.stderr.write(d));

    // Poll until server is ready
    const startTime = Date.now();
    const poll = setInterval(() => {
      http.get(`http://localhost:${PORT}`, () => {
        clearInterval(poll);
        resolve();
      }).on('error', () => {
        if (Date.now() - startTime > 30000) {
          clearInterval(poll);
          reject(new Error('Next.js server timed out'));
        }
      });
    }, 500);
  });
}

// ── Create Window ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        1024,
    minHeight:       600,
    title:           'POS + Workshop Management',
    backgroundColor: '#09090b',  // zinc-950
    webPreferences: {
      preload:            path.join(__dirname, 'preload.js'),
      contextIsolation:   true,
      nodeIntegration:    false,
    },
    // Show after ready-to-show to avoid white flash
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Remove default menu in production
  if (!IS_DEV) {
    mainWindow.setMenuBarVisibility(false);
  }
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Startup Error', `Failed to start server:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextServer) nextServer.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (nextServer) nextServer.kill();
});

// ── IPC: Backup trigger from renderer ─────────────────────────────────────
ipcMain.handle('backup:create', async (_, tag) => {
  const { createBackup } = require('../scripts/backup.js');
  return createBackup(tag || 'manual');
});
