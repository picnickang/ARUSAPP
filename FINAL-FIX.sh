#!/bin/bash
set -e

echo "🎯 ARUS - COMPREHENSIVE REBUILD WITH NEW ARCHITECTURE"
echo "====================================================="
echo ""
echo "Strategy: Run TypeScript server directly (no bundling issues)"
echo ""

# Step 1: Install tsx in production dependencies
echo "[1/5] Installing tsx for TypeScript execution..."
npm install --save tsx
echo "   ✅ tsx installed"
echo ""

# Step 2: Fix package.json
echo "[2/5] Fixing package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.main = 'electron/main.js';
pkg.description = 'Marine Predictive Maintenance & Scheduling System';
pkg.author = 'ARUS Team';
if (pkg.dependencies?.electron) {
  delete pkg.dependencies.electron;
  pkg.devDependencies.electron = '38.3.0';
}
if (pkg.dependencies?.['electron-builder']) {
  const version = pkg.dependencies['electron-builder'];
  delete pkg.dependencies['electron-builder'];
  pkg.devDependencies['electron-builder'] = version;
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "   ✅ package.json fixed"
echo ""

# Step 3: Update electron/main.js to use tsx instead of bundled code
echo "[3/5] Updating Electron to run TypeScript server directly..."
cat > electron/main-tsx.js << 'EOFMAIN'
/**
 * ARUS Electron Main Process
 * Runs TypeScript server directly using tsx (no bundling issues!)
 */

import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import net from 'net';
import http from 'http';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 5000;

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

async function startServer() {
  try {
    const portAvailable = await checkPortAvailable(SERVER_PORT);
    
    if (!portAvailable) {
      const result = dialog.showMessageBoxSync({
        type: 'error',
        title: 'Port 5000 In Use',
        message: 'Port 5000 is already being used.',
        detail: 'Please close other applications using port 5000 (like AirPlay Receiver) and restart ARUS.',
        buttons: ['Quit', 'Try Anyway']
      });
      
      if (result === 0) {
        app.quit();
        return;
      }
    }
    
    const isDev = !app.isPackaged;
    const resourcesPath = isDev ? path.join(__dirname, '..') : process.resourcesPath;
    
    // Find tsx executable (platform-specific)
    const tsxBinDir = path.join(resourcesPath, 'app', 'node_modules', '.bin');
    const tsxPath = process.platform === 'win32'
      ? path.join(tsxBinDir, 'tsx.cmd')
      : path.join(tsxBinDir, 'tsx');
    const serverPath = path.join(resourcesPath, 'app', 'server', 'index.ts');
    
    console.log('[Electron] Starting TypeScript server...');
    console.log('[Electron] tsx:', tsxPath);
    console.log('[Electron] server:', serverPath);
    
    // Verify paths exist
    if (!fs.existsSync(tsxPath)) {
      // Fallback: try to find tsx in node_modules directly
      const tsxFallback = path.join(resourcesPath, 'app', 'node_modules', 'tsx', 'dist', 'cli.mjs');
      if (!fs.existsSync(tsxFallback)) {
        dialog.showErrorBox('Build Error', `tsx not found at: ${tsxPath}\n\nPlease rebuild the application.`);
        app.quit();
        return;
      }
      console.log('[Electron] Using fallback tsx path:', tsxFallback);
    }
    
    if (!fs.existsSync(serverPath)) {
      dialog.showErrorBox('Build Error', `Server not found at: ${serverPath}\n\nPlease rebuild the application.`);
      app.quit();
      return;
    }
    
    const logDir = path.join(os.homedir(), '.arus', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `server-${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    logStream.write(`[${new Date().toISOString()}] ARUS Server Started (TypeScript Mode)\n`);
    logStream.write(`tsx: ${tsxPath}\n`);
    logStream.write(`Server: ${serverPath}\n`);
    logStream.write(`Port: ${SERVER_PORT}\n`);
    logStream.write('─'.repeat(80) + '\n');
    
    serverProcess = spawn(process.execPath, [tsxPath, serverPath], {
      cwd: path.join(resourcesPath, 'app'),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        LOCAL_MODE: 'true',
        NODE_ENV: 'production',
        PORT: SERVER_PORT.toString()
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log('[Server]', data.toString().trim());
      logStream.write(data);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('[Server]', data.toString().trim());
      logStream.write(data);
    });
    
    serverProcess.on('error', (error) => {
      console.error('[Electron] Server error:', error);
      logStream.write(`Error: ${error.message}\n`);
      logStream.end();
      dialog.showErrorBox('Server Failed', `Server failed to start:\n${error.message}\n\nLogs: ${logFile}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log('[Electron] Server exited:', code);
      logStream.write(`Exited with code ${code}\n`);
      logStream.end();
      
      if (code !== 0 && code !== null) {
        dialog.showErrorBox('Server Crashed', `Server stopped (code ${code})\n\nLogs: ${logFile}`);
        app.quit();
      }
    });
    
  } catch (error) {
    console.error('[Electron] Failed to start:', error);
    dialog.showErrorBox('Startup Failed', error.message);
  }
}

function checkServerReady(retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(`[Electron] Checking server (${attempts}/${retries})...`);
      
      const req = http.get(`http://localhost:${SERVER_PORT}/`, () => {
        console.log('[Electron] Server ready!');
        resolve();
      });
      
      req.on('error', () => {
        if (attempts >= retries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
      
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= retries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    
    check();
  });
}

async function createWindow() {
  try {
    await checkServerReady();
    
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
  } catch (error) {
    dialog.showErrorBox('Server Not Ready', error.message);
    app.quit();
  }
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});
EOFMAIN

echo "   ✅ Created electron/main-tsx.js"
echo ""

# Step 4: Create build config that ships TypeScript source
echo "[4/5] Creating build configuration..."
cat > electron-builder-tsx.yml << 'EOF'
appId: com.arus.marine.monitoring
productName: ARUS
copyright: Copyright © 2025 ARUS

directories:
  output: dist/electron

files:
  - electron/main-tsx.js
  - electron/preload.js
  - package.json

extraResources:
  - from: "server"
    to: "app/server"
    filter:
      - "**/*"
  - from: "shared"
    to: "app/shared"
    filter:
      - "**/*"
  - from: "client"
    to: "app/client"
    filter:
      - "**/*"
  - from: "node_modules"
    to: "app/node_modules"
    filter:
      - "**/*"
      - "!electron/**"
      - "!electron-builder/**"
  - from: "package.json"
    to: "app/package.json"
  - from: "tsconfig.json"
    to: "app/tsconfig.json"

mac:
  category: public.app-category.productivity
  target:
    - target: dir
  hardenedRuntime: false

compression: maximum
asar: false
EOF

echo "   ✅ Build config created"
echo ""

# Step 5: Build
echo "[5/5] Building macOS app..."
echo "   This will take 5-10 minutes (copying full source + node_modules)"
echo ""

# Update package.json to use new main file
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.main = 'electron/main-tsx.js';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

npx electron-builder --mac --x64 --config electron-builder-tsx.yml --dir

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ BUILD COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "App: dist/electron/mac/ARUS.app"
echo ""
echo "This build runs TypeScript directly (no bundling):"
echo "• More reliable (no ES module issues)"
echo "• Easier to debug (source code included)"
echo "• No top-level await problems"
echo ""
echo "🚀 Double-click to launch!"
