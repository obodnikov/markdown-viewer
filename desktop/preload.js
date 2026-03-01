// desktop/preload.js — Secure IPC bridge (contextBridge)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openFileInNewWindow: (filePath) => ipcRenderer.invoke('dialog:openFileInNewWindow', filePath || null),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),

  // Drag-and-drop file handling
  dropOpen: (filePath) => ipcRenderer.invoke('file:dropOpen', filePath),
  dropOpenNewWindow: (filePath) => ipcRenderer.invoke('file:dropOpenNewWindow', filePath),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // Environment detection
  isElectron: () => ipcRenderer.invoke('app:isElectron'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Window title
  setTitle: (title) => {
    document.title = title;
    ipcRenderer.send('window:setTitle', title);
  },

  // Dirty state — renderer notifies main process when content changes
  setDirty: (isDirty) => ipcRenderer.send('window:setDirty', isDirty),

  // Close negotiation — main process asks renderer to save before close
  onSaveAndClose: (callback) => {
    ipcRenderer.on('window:saveAndClose', () => callback());
  },

  // Renderer confirms save is done and window can close
  confirmClose: () => ipcRenderer.send('window:closeConfirmed'),

  // Renderer signals save failed — window stays open
  cancelClose: () => ipcRenderer.send('window:closeCancelled'),

  // Open external links in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // File opened via OS file association (double-click .md, drag to dock)
  onFileOpened: (callback) => {
    ipcRenderer.on('file:opened', (event, fileData) => callback(fileData));
  },

  // Menu actions from native menu bar
  onMenuAction: (action, callback) => {
    ipcRenderer.on(`menu:${action}`, () => callback());
  }
});
