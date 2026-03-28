/**
 * Electron Preload Script
 * Exposes safe IPC bridges to the renderer (Next.js app).
 * Context isolation is ON — no direct Node.js access from renderer.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Trigger a manual backup from the UI
  createBackup: (tag) => ipcRenderer.invoke('backup:create', tag),
  // App info
  platform: process.platform,
  isElectron: true,
});
