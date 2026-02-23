// desktop/preload.js — Secure IPC bridge (contextBridge)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),

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

  // Open external links in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
