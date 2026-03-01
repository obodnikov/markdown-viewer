// desktop/menu.js — Native application menu (multi-window aware)
const { Menu, app, shell, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let _createWindow = null;

function setupMenu(settingsManager, createWindow) {
  _createWindow = createWindow;
  const isMac = process.platform === 'darwin';

  // Always get the current focused/active window at click time
  const getWin = () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => openSettings()
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            if (_createWindow) {
              _createWindow({ isNewEmptyDocument: true, focus: true });
            }
          }
        },
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => getWin()?.webContents.send('menu:new')
        },
        { type: 'separator' },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => getWin()?.webContents.send('menu:open')
        },
        {
          label: 'Open in New Window...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            if (!_createWindow) return;
            const result = await dialog.showOpenDialog(getWin() || undefined, {
              filters: [
                { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              _createWindow({ filePath: result.filePaths[0], focus: true });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => getWin()?.webContents.send('menu:save')
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: () => getWin()?.webContents.send('menu:export')
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Settings...',
            accelerator: 'Ctrl+,',
            click: () => openSettings()
          },
          { type: 'separator' },
        ] : []),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Integrations menu
    {
      label: 'Integrations',
      submenu: [
        {
          label: 'GitHub...',
          accelerator: 'CmdOrCtrl+G',
          click: () => getWin()?.webContents.send('menu:github')
        },
        {
          label: 'BookStack...',
          accelerator: 'CmdOrCtrl+K',
          click: () => getWin()?.webContents.send('menu:bookstack')
        }
      ]
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/your-repo/markdown-viewer')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/your-repo/markdown-viewer/issues')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openSettings() {
  // Prevent multiple settings windows
  const existing = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Settings');
  if (existing) {
    existing.focus();
    return;
  }

  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 750,
    title: 'Settings',
    resizable: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings', 'settings.html'));
  settingsWindow.setMenuBarVisibility(false);
}

module.exports = { setupMenu, openSettings };
