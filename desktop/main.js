// desktop/main.js — Electron main process (multi-window support)
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

// --- Window Registry ---
// Replaces single mainWindow variable. Each entry tracks per-window metadata.
const windows = new Map();
let nextWindowId = 1;

let flaskManager = null;
let flaskPort = null;
const settingsManager = new SettingsManager();

// --- Single instance lock ---
let pendingFilePaths = [];

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const filePath = getFileFromArgs(argv);
    if (filePath) {
      createWindow({ filePath: path.resolve(filePath), focus: true });
    } else {
      // No file — focus an existing window or create a new one
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length > 0) {
        const win = allWindows[0];
        if (win.isMinimized()) win.restore();
        win.focus();
      } else {
        createWindow({ isNewEmptyDocument: true, focus: true });
      }
    }
  });
}

// macOS: file opened via double-click or drag to dock
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    createWindow({ filePath, focus: true });
  } else {
    pendingFilePaths.push(filePath);
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

// --- Window Management ---

function getWindowEntry(browserWindow) {
  for (const [id, entry] of windows) {
    if (entry.browserWindow === browserWindow) return { id, ...entry };
  }
  return null;
}

function getWindowEntryByWebContents(webContents) {
  for (const [id, entry] of windows) {
    if (entry.browserWindow && entry.browserWindow.webContents === webContents) {
      return { id, ...entry };
    }
  }
  return null;
}

// --- Recent Files ---

const MAX_RECENT_FILES = 10;

function addRecentFile(filePath) {
  if (!filePath) return;
  const absolutePath = path.resolve(filePath);
  let recent = settingsManager.get('recentFiles', []);
  // Remove if already present, then prepend
  recent = recent.filter(f => f !== absolutePath);
  recent.unshift(absolutePath);
  // Limit to max
  if (recent.length > MAX_RECENT_FILES) {
    recent = recent.slice(0, MAX_RECENT_FILES);
  }
  settingsManager.set('recentFiles', recent);
  // Rebuild menu to reflect new recent files
  if (_refreshMenu) _refreshMenu();
}

function clearRecentFiles() {
  settingsManager.set('recentFiles', []);
  if (_refreshMenu) _refreshMenu();
}

// Menu refresh callback — set by setupMenu
let _refreshMenu = null;

// --- Window Title Helpers ---

function buildWindowTitle(fileName, isDirty) {
  const dirtyIndicator = isDirty ? '● ' : '';
  const name = fileName || 'Untitled';
  return `${dirtyIndicator}${name} — Markdown Viewer`;
}

function updateWindowTitle(browserWindow, windowId) {
  const entry = windows.get(windowId);
  if (!entry || !browserWindow || browserWindow.isDestroyed()) return;
  const fileName = entry.filePath ? path.basename(entry.filePath) : null;
  browserWindow.setTitle(buildWindowTitle(fileName, entry.isDirty));
}

async function openFileInWindow(browserWindow, filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    browserWindow.webContents.send('file:opened', {
      path: absolutePath,
      name: path.basename(absolutePath),
      content
    });

    // Update registry
    const entry = getWindowEntry(browserWindow);
    if (entry) {
      windows.get(entry.id).filePath = absolutePath;
      windows.get(entry.id).isDirty = false;
      updateWindowTitle(browserWindow, entry.id);
    }

    addRecentFile(absolutePath);
  } catch (error) {
    console.error(`[Main] Failed to open file: ${error.message}`);
    dialog.showErrorBox('File Open Error', `Could not open file:\n${filePath}\n\n${error.message}`);
  }
}

async function createWindow(options = {}) {
  const { filePath = null, isNewEmptyDocument = false, focus = true } = options;

  try {
    const windowId = nextWindowId++;

    // Offset new windows so they don't stack exactly on top of each other
    const existingCount = BrowserWindow.getAllWindows().length;
    const offset = existingCount * 30;

    const defaultWidth = settingsManager.get('windowWidth', 1400);
    const defaultHeight = settingsManager.get('windowHeight', 900);
    const defaultX = settingsManager.get('windowX');
    const defaultY = settingsManager.get('windowY');

    const winOptions = {
      width: defaultWidth,
      height: defaultHeight,
      minWidth: 800,
      minHeight: 600,
      title: buildWindowTitle(filePath ? path.basename(filePath) : null, false),
      icon: path.join(__dirname, 'icons', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };

    // Position: use saved position for first window, offset for subsequent
    if (existingCount === 0 && defaultX !== undefined && defaultY !== undefined) {
      winOptions.x = defaultX;
      winOptions.y = defaultY;
    } else if (existingCount > 0) {
      // Offset from the last existing window's position, or from saved defaults
      const allWins = BrowserWindow.getAllWindows();
      const lastWin = allWins[allWins.length - 1];
      const baseBounds = lastWin ? lastWin.getBounds() : null;

      if (baseBounds) {
        winOptions.x = baseBounds.x + 30;
        winOptions.y = baseBounds.y + 30;
      } else if (defaultX !== undefined && defaultY !== undefined) {
        winOptions.x = defaultX + offset;
        winOptions.y = defaultY + offset;
      }
      // If neither exists, omit x/y and let Electron center the window
    }

    const win = new BrowserWindow(winOptions);

    // Only maximize the first window if that was the saved state
    if (existingCount === 0 && settingsManager.get('windowMaximized', false)) {
      win.maximize();
    }

    // Register in window map
    windows.set(windowId, {
      browserWindow: win,
      filePath: filePath,
      isDirty: false,
      isReady: false,
      pendingOpenPath: filePath
    });

    win.webContents.on('did-finish-load', () => {
      const entry = windows.get(windowId);
      if (entry) {
        entry.isReady = true;
        // Open pending file after renderer is ready
        if (entry.pendingOpenPath) {
          openFileInWindow(win, entry.pendingOpenPath);
          entry.pendingOpenPath = null;
        }
      }
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Main] Window ${windowId} failed to load: ${errorDescription} (code: ${errorCode})`);
    });

    win.loadURL('app://./index.html');

    // --- Close interception for unsaved changes ---
    win.on('close', (e) => {
      const entry = windows.get(windowId);
      if (entry && entry.isDirty && !entry.forceClose) {
        e.preventDefault();
        handleDirtyWindowClose(windowId, win);
      }
    });

    win.on('closed', () => {
      windows.delete(windowId);
    });

    // Persist window bounds from the focused window
    win.on('resize', () => saveWindowBounds(win));
    win.on('move', () => saveWindowBounds(win));
    win.on('maximize', () => settingsManager.set('windowMaximized', true));
    win.on('unmaximize', () => settingsManager.set('windowMaximized', false));

    if (focus) {
      win.focus();
    }

    return windowId;
  } catch (error) {
    console.error(`[Main] Failed to create window: ${error.message}`);
    return null;
  }
}

function saveWindowBounds(win) {
  if (win && !win.isMaximized()) {
    const bounds = win.getBounds();
    settingsManager.set('windowWidth', bounds.width);
    settingsManager.set('windowHeight', bounds.height);
    settingsManager.set('windowX', bounds.x);
    settingsManager.set('windowY', bounds.y);
  }
}

// --- Dirty window close handling ---

// Pending save confirmations: windowId → { resolve }
const pendingSaveConfirmations = new Map();

const SAVE_TIMEOUT_MS = 10000; // 10 seconds safety timeout

function waitForSaveConfirmation(windowId) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingSaveConfirmations.delete(windowId);
      resolve('timeout');
    }, SAVE_TIMEOUT_MS);

    pendingSaveConfirmations.set(windowId, {
      resolve: (result) => {
        clearTimeout(timer);
        pendingSaveConfirmations.delete(windowId);
        resolve(result);
      }
    });
  });
}

function resolveSaveConfirmation(windowId, result) {
  const pending = pendingSaveConfirmations.get(windowId);
  if (pending) {
    pending.resolve(result);
  }
}

async function promptDirtyWindow(win, windowId, actionLabel) {
  const entry = windows.get(windowId);
  if (!entry || !win || win.isDestroyed()) return 'cancel';

  const fileName = entry.filePath ? path.basename(entry.filePath) : 'Untitled';

  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Unsaved Changes',
    message: `"${fileName}" has unsaved changes.`,
    detail: `Do you want to save before ${actionLabel}?`,
    buttons: ['Save', 'Discard', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  });

  if (response === 0) {
    // Save — ask renderer to save, wait for confirmation
    if (win.isDestroyed() || win.webContents.isDestroyed()) {
      return 'failed';
    }
    try {
      win.webContents.send('window:saveAndClose');
    } catch (err) {
      console.error(`[Main] Failed to send saveAndClose to window ${windowId}: ${err.message}`);
      return 'failed';
    }
    const result = await waitForSaveConfirmation(windowId);
    // result: 'saved', 'failed', or 'timeout'
    return result === 'saved' ? 'saved' : 'failed';
  } else if (response === 1) {
    return 'discard';
  }
  return 'cancel';
}

async function handleDirtyWindowClose(windowId, win) {
  const result = await promptDirtyWindow(win, windowId, 'closing');

  if (result === 'saved') {
    // closeConfirmed handler already closes the window
    return;
  } else if (result === 'discard') {
    const entry = windows.get(windowId);
    if (entry) entry.forceClose = true;
    win.close();
  } else if (result === 'failed') {
    // Save failed or timed out — show error, keep window open
    dialog.showErrorBox('Save Failed', 'The file could not be saved. The window will remain open.');
  }
  // 'cancel' — do nothing, window stays open
}

// --- Quit coordination ---
let isQuitting = false;

async function handleAppQuit(e) {
  if (isQuitting) return;

  const dirtyWindows = [];
  for (const [id, entry] of windows) {
    if (entry.isDirty && !entry.forceClose) {
      dirtyWindows.push({ id, entry });
    }
  }

  if (dirtyWindows.length === 0) return; // All clean, quit proceeds

  e.preventDefault();
  isQuitting = true;

  for (const { id, entry } of dirtyWindows) {
    const win = entry.browserWindow;
    if (!win || win.isDestroyed()) continue;

    // Re-check dirty state — may have been resolved by a previous iteration
    const currentEntry = windows.get(id);
    if (!currentEntry || !currentEntry.isDirty) continue;

    const result = await promptDirtyWindow(win, id, 'quitting');

    if (result === 'saved') {
      // Window will be closed by closeConfirmed handler — verify it's gone
      if (win && !win.isDestroyed()) {
        // closeConfirmed may not have fired yet; mark for force close
        const updatedEntry = windows.get(id);
        if (updatedEntry) updatedEntry.forceClose = true;
      }
      continue;
    } else if (result === 'discard') {
      entry.forceClose = true;
    } else if (result === 'failed') {
      // Save failed — abort quit, keep window open
      dialog.showErrorBox('Save Failed', 'The file could not be saved. Quit cancelled.');
      isQuitting = false;
      return;
    } else {
      // Cancel — abort entire quit
      isQuitting = false;
      return;
    }
  }

  // All dirty windows handled — force close remaining and quit
  for (const [id, entry] of windows) {
    entry.forceClose = true;
  }
  isQuitting = false;
  app.quit();
}

// --- App lifecycle ---

app.whenReady().then(async () => {
  // Start Flask backend
  flaskManager = new FlaskManager(settingsManager, isDev);

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

  // Register protocol once — must happen before first loadURL
  registerProtocol(flaskPort);

  // Open pending files from macOS open-file events or CLI args
  const filesToOpen = [...pendingFilePaths];
  pendingFilePaths = [];

  const fileFromArgs = getFileFromArgs(process.argv);
  if (fileFromArgs) {
    filesToOpen.push(fileFromArgs);
  }

  if (filesToOpen.length > 0) {
    // Open each file in its own window
    for (const fp of filesToOpen) {
      await createWindow({ filePath: fp, focus: true });
    }
  } else {
    // No files — open one empty window
    await createWindow({ isNewEmptyDocument: true, focus: true });
  }

  // Setup native menu — pass createWindow so menu can create new windows
  const refreshMenu = setupMenu(settingsManager, createWindow);
  _refreshMenu = refreshMenu;

  // Check for pandoc (non-blocking) — show in first window
  const firstWin = BrowserWindow.getAllWindows()[0];
  const pandoc = flaskManager.checkPandoc();
  if (!pandoc.available && firstWin) {
    dialog.showMessageBox(firstWin, {
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
  if (!settingsManager.isConfigured() && firstWin) {
    const response = await dialog.showMessageBox(firstWin, {
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

  app.on('activate', async () => {
    // macOS: re-create window when dock icon clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow({ isNewEmptyDocument: true, focus: true });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (e) => {
  handleAppQuit(e);
  if (flaskManager) {
    flaskManager.stop();
  }
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openFile', async (event, options) => {
  // Resolve the window that sent this request
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(senderWindow || BrowserWindow.getFocusedWindow(), {
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

    // Update registry so main process knows which file this window has open
    if (senderWindow) {
      const entry = getWindowEntry(senderWindow);
      if (entry) {
        windows.get(entry.id).filePath = filePath;
      }
    }

    return { path: filePath, name: path.basename(filePath), content };
  } catch (error) {
    console.error(`[Main] Failed to read file: ${error.message}`);
    return null;
  }
});

ipcMain.handle('dialog:openFileInNewWindow', async (event, filePath) => {
  // Renderer requests opening a file in a new window
  try {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      // Validate file exists and is readable before creating a window
      try {
        await fs.promises.access(absolutePath, fs.constants.R_OK);
      } catch {
        console.error(`[Main] File not accessible: ${absolutePath}`);
        return { success: false, error: `File not accessible: ${absolutePath}` };
      }
      const windowId = await createWindow({ filePath: absolutePath, focus: true });
      return { success: !!windowId, windowId };
    }
    // No path provided — show file dialog then open in new window
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(senderWindow || undefined, {
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (result.canceled) return { success: false };
    const windowId = await createWindow({ filePath: result.filePaths[0], focus: true });
    return { success: !!windowId, windowId };
  } catch (error) {
    console.error(`[Main] openFileInNewWindow failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dialog:saveFile', async (event, { content, defaultName }) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(senderWindow || BrowserWindow.getFocusedWindow(), {
    defaultPath: defaultName || 'untitled.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  try {
    await fs.promises.writeFile(result.filePath, content, 'utf-8');

    // Update registry so main process tracks the saved file path
    if (senderWindow) {
      const entry = getWindowEntry(senderWindow);
      if (entry) {
        windows.get(entry.id).filePath = result.filePath;
        windows.get(entry.id).isDirty = false;
        updateWindowTitle(senderWindow, entry.id);
      }
    }

    addRecentFile(result.filePath);

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

ipcMain.handle('app:getRecentFiles', () => {
  return settingsManager.get('recentFiles', []);
});

ipcMain.handle('app:clearRecentFiles', () => {
  clearRecentFiles();
  return { success: true };
});

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
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.setTitle(title);
  }
});

ipcMain.on('window:setDirty', (event, isDirty) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow) {
    const entry = getWindowEntry(senderWindow);
    if (entry) {
      windows.get(entry.id).isDirty = !!isDirty;
      updateWindowTitle(senderWindow, entry.id);
    }
  }
});

ipcMain.on('window:closeConfirmed', (event) => {
  // Renderer confirms it has saved and is ready to close
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow) {
    const entry = getWindowEntry(senderWindow);
    if (entry) {
      windows.get(entry.id).isDirty = false;
      windows.get(entry.id).forceClose = true;
      resolveSaveConfirmation(entry.id, 'saved');
    }
    senderWindow.close();
  }
});

ipcMain.on('window:closeCancelled', (event) => {
  // Renderer signals save failed — window stays open
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow) {
    const entry = getWindowEntry(senderWindow);
    if (entry) {
      resolveSaveConfirmation(entry.id, 'failed');
    }
  }
});

ipcMain.handle('file:dropOpen', async (event, filePath) => {
  // File dropped onto a window — open it in that same window
  try {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow || !filePath) {
      return { success: false, error: 'No target window or file path' };
    }
    const absolutePath = path.resolve(filePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
    } catch {
      console.error(`[Main] Dropped file not accessible: ${absolutePath}`);
      return { success: false, error: `File not accessible: ${absolutePath}` };
    }
    await openFileInWindow(senderWindow, absolutePath);
    return { success: true };
  } catch (error) {
    console.error(`[Main] dropOpen failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:dropOpenNewWindow', async (event, filePath) => {
  // File dropped with modifier key — open in a new window
  try {
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }
    const absolutePath = path.resolve(filePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
    } catch {
      console.error(`[Main] Dropped file not accessible: ${absolutePath}`);
      return { success: false, error: `File not accessible: ${absolutePath}` };
    }
    const windowId = await createWindow({ filePath: absolutePath, focus: true });
    return { success: !!windowId, windowId };
  } catch (error) {
    console.error(`[Main] dropOpenNewWindow failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Expose createWindow for external use (e.g., menu module)
module.exports = { createWindow };
