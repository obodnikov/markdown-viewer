// Shared mock for all Electron APIs
// This is loaded via vitest resolve.alias for ALL require('electron') calls
'use strict';

class BrowserWindow {
  constructor(opts = {}) {
    this._title = opts.title || '';
    this.webContents = { send: () => {}, on: () => {} };
  }
  getTitle() { return this._title; }
  setTitle(t) { this._title = t; }
  getBounds() { return { width: 800, height: 600, x: 0, y: 0 }; }
  isMinimized() { return false; }
  isMaximized() { return false; }
  maximize() {}
  restore() {}
  focus() {}
  close() {}
  on() { return this; }
  loadURL() { return Promise.resolve(); }
  loadFile() { return Promise.resolve(); }
  setMenuBarVisibility() {}
}
BrowserWindow.getAllWindows = () => [];

const app = {
  isPackaged: false,
  name: 'Markdown Viewer',
  getVersion: () => '2.0.0',
  getPath: (name) => `/mock/${name}`,
  requestSingleInstanceLock: () => true,
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
