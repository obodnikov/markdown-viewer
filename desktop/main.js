// desktop/main.js — Electron main process
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const FlaskManager = require('./flask-manager');
const SettingsManager = require('./settings-manager');
const { registerProtocol } = require('./protocol');

// Parse CLI args
const isDev = process.argv.includes('--dev');

let mainWindow = null;
let flaskManager = null;
const settingsManager = new SettingsManager();

async function createWindow(flaskPort) {
  try {
    mainWindow = new BrowserWindow({
      width: settingsManager.get('windowWidth', 1400),
      height: settingsManager.get('windowHeight', 900),
      x: settingsManager.get('windowX'),
      y: settingsManager.get('windowY'),
      minWidth: 800,
      minHeight: 600,
      title: 'Markdown Viewer',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    if (settingsManager.get('windowMaximized', false)) {
      mainWindow.maximize();
    }

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Main] Failed to load: ${errorDescription} (code: ${errorCode})`);
    });

    // Register custom protocol and load the app
    registerProtocol(flaskPort);
    mainWindow.loadURL('app://./index.html');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Persist window state
    mainWindow.on('resize', () => saveWindowBounds());
    mainWindow.on('move', () => saveWindowBounds());
    mainWindow.on('maximize', () => settingsManager.set('windowMaximized', true));
    mainWindow.on('unmaximize', () => settingsManager.set('windowMaximized', false));
  } catch (error) {
    console.error(`[Main] Failed to create window: ${error.message}`);
  }
}

function saveWindowBounds() {
  if (mainWindow && !mainWindow.isMaximized()) {
    const bounds = mainWindow.getBounds();
    settingsManager.set('windowWidth', bounds.width);
    settingsManager.set('windowHeight', bounds.height);
    settingsManager.set('windowX', bounds.x);
    settingsManager.set('windowY', bounds.y);
  }
}

// --- App lifecycle ---

app.whenReady().then(async () => {
  // Start Flask backend
  flaskManager = new FlaskManager(settingsManager, isDev);

  let flaskPort = null;
  try {
    flaskPort = await flaskManager.start();
    console.log(`[Main] Flask backend running on port ${flaskPort}`);
  } catch (error) {
    console.error(`[Main] Flask failed to start: ${error.message}`);
    dialog.showErrorBox(
      'Backend Error',
      `Failed to start the Flask backend.\n\n${error.message}\n\nThe app will open but API features won't work.`
    );
  }

  await createWindow(flaskPort);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(flaskPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (flaskManager) {
    flaskManager.stop();
  }
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile'],
    ...options
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { path: filePath, name: path.basename(filePath), content };
});

ipcMain.handle('dialog:saveFile', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'untitled.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return { path: result.filePath, name: path.basename(result.filePath) };
});

ipcMain.handle('settings:get', () => {
  return settingsManager.getAll();
});

ipcMain.handle('settings:set', async (event, settings) => {
  settingsManager.setAll(settings);
  // Restart Flask with new settings if it's running
  if (flaskManager && !isDev) {
    try {
      await flaskManager.restart();
      console.log('[Main] Flask restarted with new settings');
      return { success: true };
    } catch (error) {
      console.error(`[Main] Flask restart failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  return { success: true };
});

ipcMain.handle('app:isElectron', () => true);

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('shell:openExternal', (event, url) => {
  return shell.openExternal(url);
});

ipcMain.on('window:setTitle', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});
