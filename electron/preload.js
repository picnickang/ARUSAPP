/**
 * Electron Preload Script
 * Safely exposes limited Node.js APIs to renderer
 */

const { contextBridge } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
