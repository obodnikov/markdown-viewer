// desktop/main.js — Electron main process
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const FlaskManager = require('./flask-manager');
const SettingsManager = require('./settings-manager');
const { registerScheme, registerProtocol } = require('./protocol');
const { setupMenu, openSettings } = require('./menu');

// Register app:// as privileged scheme — must happen before app.whenReady()
registerScheme();

// Parse CLI args
const isDev = process.argv.includes('--dev');

let mainWindow = null;
let flaskManager = null;
const settingsManager = new SettingsManager();

// --- Single instance lock ---
let pendingFilePath = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const filePath = getFileFromArgs(argv);
    if (filePath) {
      if (mainWindow) {
        openFileInRenderer(path.resolve(filePath)).catch(err =>
          console.error(`[Main] second-instance file open failed: ${err.message}`)
        );
      } else {
        pendingFilePath = path.resolve(filePath);
      }
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS: file opened via double-click or drag to dock
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    openFileInRenderer(filePath);
  } else {
    pendingFilePath = filePath;
  }
});

function getFileFromArgs(argv) {
  const fileArg = argv.find(arg =>
    !arg.startsWith('-') &&
    !arg.includes('electron') &&
    !arg.includes('node_modules') &&
    (arg.endsWith('.md') || arg.endsWith('.markdown') || arg.endsWith('.txt')) &&
    fs.existsSync(arg)
  );
  return fileArg || null;
}

async function openFileInRenderer(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    mainWindow.webContents.send('file:opened', {
      path: absolutePath,
      name: path.basename(absolutePath),
      content
    });
    mainWindow.setTitle(`${path.basename(absolutePath)} — Markdown Viewer`);
  } catch (error) {
    console.error(`[Main] Failed to open file: ${error.message}`);
    dialog.showErrorBox('File Open Error', `Could not open file:\n${filePath}\n\n${error.message}`);
  }
}

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
      icon: path.join(__dirname, '..', 'icons', 'icon-512.png'),
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

  // Setup native menu (needs mainWindow reference)
  setupMenu(mainWindow, settingsManager);

  // Check for pandoc (non-blocking)
  const pandoc = flaskManager.checkPandoc();
  if (!pandoc.available) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Pandoc Not Found',
      message: 'PDF and DOCX export requires pandoc',
      detail: 'Pandoc was not detected on your system. Markdown and HTML export will still work.\n\nInstall pandoc from: https://pandoc.org/installing.html',
      buttons: ['Install Pandoc', 'Later'],
      defaultId: 1
    }).then(({ response }) => {
      if (response === 0) {
        shell.openExternal('https://pandoc.org/installing.html');
      }
    });
  }

  // First-run: open settings if no API key configured
  if (!settingsManager.isConfigured()) {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Welcome',
      message: 'Welcome to Markdown Viewer Desktop',
      detail: 'To use LLM features, please configure your OpenRouter API key in Settings.',
      buttons: ['Open Settings', 'Later']
    });
    if (response.response === 0) {
      openSettings();
    }
  }

  // Open file from CLI args (Windows/Linux) or pending macOS open-file event
  if (pendingFilePath) {
    await openFileInRenderer(pendingFilePath);
    pendingFilePath = null;
  } else {
    const fileFromArgs = getFileFromArgs(process.argv);
    if (fileFromArgs) {
      await openFileInRenderer(fileFromArgs);
    }
  }

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
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { path: filePath, name: path.basename(filePath), content };
  } catch (error) {
    console.error(`[Main] Failed to read file: ${error.message}`);
    return null;
  }
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
  try {
    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return { path: result.filePath, name: path.basename(result.filePath) };
  } catch (error) {
    console.error(`[Main] Failed to write file: ${error.message}`);
    return null;
  }
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

ipcMain.handle('shell:openExternal', async (event, url) => {
  // Only allow http/https URLs for security
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      await shell.openExternal(url);
      return true;
    }
    console.warn(`[Main] Blocked openExternal for non-http URL: ${url}`);
    return false;
  } catch (error) {
    console.warn(`[Main] openExternal failed: ${error.message}`);
    return false;
  }
});

ipcMain.on('window:setTitle', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});
