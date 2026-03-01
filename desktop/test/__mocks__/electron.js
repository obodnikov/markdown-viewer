// Shared mock for all Electron APIs
// This is loaded via vitest resolve.alias for ALL require('electron') calls
'use strict';

const _allWindows = [];

class BrowserWindow {
  constructor(opts = {}) {
    this._id = BrowserWindow._nextId++;
    this._title = opts.title || '';
    this._bounds = {
      width: opts.width || 800,
      height: opts.height || 600,
      x: opts.x || 0,
      y: opts.y || 0
    };
    this._minimized = false;
    this._maximized = false;
    this._destroyed = false;
    this.webContents = {
      send: () => {},
      on: () => {},
      _ownerWindow: this
    };
    _allWindows.push(this);
  }
  get id() { return this._id; }
  getTitle() { return this._title; }
  setTitle(t) { this._title = t; }
  getBounds() { return { ...this._bounds }; }
  isMinimized() { return this._minimized; }
  isMaximized() { return this._maximized; }
  maximize() { this._maximized = true; }
  restore() { this._minimized = false; }
  focus() {}
  close() {
    this._destroyed = true;
    const idx = _allWindows.indexOf(this);
    if (idx !== -1) _allWindows.splice(idx, 1);
  }
  on() { return this; }
  loadURL() { return Promise.resolve(); }
  loadFile() { return Promise.resolve(); }
  setMenuBarVisibility() {}
}

BrowserWindow._nextId = 1;
BrowserWindow.getAllWindows = () => [..._allWindows];
BrowserWindow.getFocusedWindow = () => _allWindows[0] || null;
BrowserWindow.fromWebContents = (wc) => {
  if (wc && wc._ownerWindow) return wc._ownerWindow;
  return null;
};
// Test helper: clear all tracked windows
BrowserWindow._resetAll = () => {
  _allWindows.length = 0;
  BrowserWindow._nextId = 1;
};

const app = {
  isPackaged: false,
  name: 'Markdown Viewer',
  getVersion: () => '2.0.0',
  getPath: (name) => `/mock/${name}`,
  requestSingleInstanceLock: () => true,
  isReady: () => true,
  whenReady: () => Promise.resolve(),
  on: () => {},
  quit: () => {},
};

const _templates = [];

const Menu = {
  buildFromTemplate: (template) => {
    _templates.push(template);
    return { template };
  },
  setApplicationMenu: () => {},
  _getLastTemplate: () => _templates[_templates.length - 1],
  _clearTemplates: () => { _templates.length = 0; },
};

const protocol = {
  registerSchemesAsPrivileged: () => {},
  handle: () => {},
};

const net = {
  fetch: async () => new Response('{}', { status: 200 }),
};

const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: true }),
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox: () => {},
};

const shell = {
  openExternal: async () => true,
};

const ipcMain = {
  handle: () => {},
  on: () => {},
};

const ipcRenderer = {
  invoke: async () => {},
  send: () => {},
};

const contextBridge = {
  exposeInMainWorld: () => {},
};

module.exports = {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  protocol,
  net,
  ipcMain,
  ipcRenderer,
  contextBridge,
};
