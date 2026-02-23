// desktop/main.js — Phase 1: Minimal entry point
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      title: 'Markdown Viewer'
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Main] Failed to load: ${errorDescription} (code: ${errorCode})`);
    });

    mainWindow.loadFile(path.join(__dirname, 'placeholder.html'));

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error(`[Main] Failed to create window: ${error.message}`);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
