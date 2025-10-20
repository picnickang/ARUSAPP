#!/bin/bash
set -e

echo "🔧 Fixing Electron ES Module Issue"
echo "===================================="
echo ""

# Fix package.json
echo "Step 1: Fixing package.json..."
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
echo "✅ Done"
echo ""

# Convert electron/main.js to ES modules
echo "Step 2: Converting electron/main.js to ES modules..."
cat > electron/main.js << 'EOFILE'
/**
 * ARUS Electron Main Process
 * Creates native desktop application with system tray
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import os from 'os';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let tray = null;
let serverProcess = null;
const SERVER_PORT = process.env.PORT || 5000;

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window when app is activated (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  console.log('[Electron] Application shutting down');
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Check if port is available
function checkPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, error: null });
      } else if (err.code === 'EACCES') {
        reject(new Error(\`Permission denied for port \${port}. Try a different port or run with elevated privileges.\`));
      } else {
        console.warn('[Electron] Port check error:', err.code, err.message);
        resolve({ available: true, error: err });
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve({ available: true, error: null });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Rotate log files to prevent unbounded growth
function rotateLogFiles(logDir, maxFiles = 20) {
  try {
    if (!fs.existsSync(logDir)) {
      return;
    }
    
    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.startsWith('server-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        time: fs.statSync(path.join(logDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (logFiles.length > maxFiles) {
      const filesToDelete = logFiles.slice(maxFiles);
      console.log(\`[Electron] Rotating logs: keeping \${maxFiles}, deleting \${filesToDelete.length} old files\`);
      
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.warn('[Electron] Failed to delete old log:', file.name, err.message);
        }
      }
    }
  } catch (error) {
    console.warn('[Electron] Log rotation failed:', error.message);
  }
}

// Start the Express server (bundled version - spawned as separate process)
async function startServer() {
  try {
    let portCheckResult;
    try {
      portCheckResult = await checkPortAvailable(SERVER_PORT);
    } catch (portError) {
      dialog.showErrorBox(
        'Port Check Failed',
        \`Cannot check port \${SERVER_PORT}:\n\${portError.message}\n\nThe application will now quit.\`
      );
      app.quit();
      return;
    }
    
    if (!portCheckResult.available) {
      const result = dialog.showMessageBoxSync({
        type: 'error',
        title: 'Port Already in Use',
        message: \`Port \${SERVER_PORT} is already being used by another application.\`,
        detail: 'ARUS needs port 5000 to run. Please close any application using this port and restart ARUS.\n\nCommon applications that use port 5000:\n• AirPlay Receiver (macOS 12+)\n• Other development servers\n• Flask applications\n• Another instance of ARUS',
        buttons: ['Quit', 'Try Anyway']
      });
      
      if (result === 0) {
        app.quit();
        return;
      }
    }
    
    const isDev = !app.isPackaged;
    const serverPath = isDev 
      ? path.join(__dirname, '../dist/index.js')
      : path.join(process.resourcesPath, 'app/dist/index.js');
    
    console.log('[Electron] Starting server from:', serverPath);
    console.log('[Electron] Is packaged:', app.isPackaged);
    if (app.isPackaged) {
      console.log('[Electron] Resources path:', process.resourcesPath);
    }
    
    if (!isDev && process.platform === 'darwin' && process.arch === 'arm64') {
      console.log('[Electron] ⚠️  Running on Apple Silicon - bundled Node.js will use Rosetta 2');
    }
    
    let nodePath;
    let nodeEnv = { ...process.env };
    
    if (isDev) {
      nodePath = 'node';
    } else {
      const nodeRuntimeDir = path.join(process.resourcesPath, 'nodejs');
      
      if (process.platform === 'win32') {
        nodePath = path.join(nodeRuntimeDir, 'node.exe');
        const currentPath = nodeEnv.PATH || nodeEnv.Path || '';
        nodeEnv.PATH = \`\${nodeRuntimeDir};\${currentPath}\`;
      } else if (process.platform === 'darwin') {
        nodePath = path.join(nodeRuntimeDir, 'bin/node');
        nodeEnv.DYLD_LIBRARY_PATH = path.join(nodeRuntimeDir, 'lib');
      } else {
        nodePath = path.join(nodeRuntimeDir, 'bin/node');
        nodeEnv.LD_LIBRARY_PATH = path.join(nodeRuntimeDir, 'lib');
      }
    }
    
    console.log('[Electron] Using Node.js from:', nodePath);
    console.log('[Electron] Platform:', process.platform);
    if (!isDev) {
      if (process.platform === 'win32') {
        console.log('[Electron] PATH configured for Windows');
      } else if (process.platform === 'darwin') {
        console.log('[Electron] Library path (DYLD):', nodeEnv.DYLD_LIBRARY_PATH);
      } else {
        console.log('[Electron] Library path (LD):', nodeEnv.LD_LIBRARY_PATH);
      }
    }
    
    const logDir = path.join(os.homedir(), '.arus', 'logs');
    const logFile = path.join(logDir, \`server-\${Date.now()}.log\`);
    
    let logStream = null;
    let logStreamClosed = false;
    
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      rotateLogFiles(logDir, 20);
      
      logStream = fs.createWriteStream(logFile, { flags: 'a' });
      logStream.write(\`[\${new Date().toISOString()}] ARUS Server Started\n\`);
      logStream.write(\`Node Path: \${nodePath}\n\`);
      logStream.write(\`Server Path: \${serverPath}\n\`);
      logStream.write(\`Port: \${SERVER_PORT}\n\`);
      logStream.write(\`Platform: \${process.platform} \${process.arch}\n\`);
      logStream.write('─'.repeat(80) + '\n');
    } catch (logError) {
      console.error('[Electron] Failed to create log file:', logError);
    }
    
    const safeLogWrite = (data) => {
      if (logStream && !logStreamClosed) {
        logStream.write(data);
      }
    };
    
    const closeLog = () => {
      if (logStream && !logStreamClosed) {
        logStreamClosed = true;
        logStream.end();
      }
    };
    
    const workingDir = isDev 
      ? path.join(__dirname, '..')
      : path.join(process.resourcesPath, 'app');
    
    serverProcess = spawn(nodePath, [serverPath], {
      cwd: workingDir,
      env: {
        ...nodeEnv,
        LOCAL_MODE: 'true',
        NODE_ENV: 'production',
        PORT: SERVER_PORT.toString()
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    serverProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log('[Server]', message);
      safeLogWrite(data);
    });
    
    serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error('[Server Error]', message);
      safeLogWrite(data);
    });
    
    serverProcess.on('error', (error) => {
      console.error('[Electron] Failed to start server:', error);
      const errorMsg = \`[\${new Date().toISOString()}] Spawn error: \${error.message}\n\`;
      safeLogWrite(errorMsg);
      safeLogWrite('═'.repeat(80) + '\n\n');
      closeLog();
      
      dialog.showErrorBox(
        'Server Start Failed',
        \`Failed to start ARUS server:\n\${error.message}\n\nLogs saved to:\n\${logFile}\n\nPlease check the logs and try again.\`
      );
    });
    
    serverProcess.on('close', (code) => {
      const exitMsg = \`[\${new Date().toISOString()}] Server exited with code \${code}\n\`;
      console.log(\`[Electron] Server process exited with code \${code}\`);
      
      safeLogWrite(exitMsg);
      safeLogWrite('═'.repeat(80) + '\n\n');
      closeLog();
      
      if (code !== 0 && code !== null) {
        dialog.showErrorBox(
          'Server Crashed',
          \`ARUS server stopped unexpectedly (exit code: \${code})\n\nLogs saved to:\n\${logFile}\n\nThe application will now close.\`
        );
        app.quit();
      }
    });
    
    console.log('[Electron] Server process started successfully');
  } catch (error) {
    console.error('[Electron] Failed to start server:', error);
    dialog.showErrorBox(
      'Server Start Failed',
      \`Failed to start ARUS server:\n\${error.message}\n\nPlease check the logs and try again.\`
    );
  }
}

// Check if server is ready
function checkServerReady(retries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(\`[Electron] Checking server readiness (attempt \${attempts}/\${retries})...\`);
      
      const req = http.get(\`http://localhost:\${SERVER_PORT}/\`, (res) => {
        console.log('[Electron] Server is ready!');
        resolve();
      });
      
      req.on('error', (err) => {
        if (attempts >= retries) {
          console.error('[Electron] Server failed to start after', retries, 'attempts');
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, interval);
        }
      });
      
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= retries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    
    check();
  });
}

// Create the browser window
async function createWindow() {
  try {
    console.log('[Electron] Waiting for server to be ready...');
    await checkServerReady();
    
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      backgroundColor: '#0a0a0a'
    });

    mainWindow.loadURL(\`http://localhost:\${SERVER_PORT}\`);
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Electron] Failed to load:', errorDescription);
      if (errorCode === -102) {
        console.log('[Electron] Retrying in 2 seconds...');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(\`http://localhost:\${SERVER_PORT}\`);
          }
        }, 2000);
      }
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Electron] Dashboard loaded successfully');
    });
    
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error('[Electron] Failed to create window:', error);
    dialog.showErrorBox(
      'Server Not Ready',
      \`ARUS server did not start in time.\n\n\${error.message}\n\nPlease try restarting the application.\`
    );
    app.quit();
  }
}

// Create system tray
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ARUS Marine Monitoring',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Dashboard',
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(\`http://localhost:\${SERVER_PORT}\`);
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Server',
      click: () => {
        if (serverProcess) {
          serverProcess.kill();
          setTimeout(() => startServer(), 1000);
        }
      }
    },
    {
      label: 'Restart Application',
      click: () => {
        app.relaunch();
        app.quit();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('ARUS Marine Monitoring');
  
  tray.on('double-click', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
}

// App ready
app.whenReady().then(async () => {
  await startServer();
  await createWindow();
  createTray();
});
EOFILE
echo "✅ Done"
echo ""

echo "✅ All fixes applied!"
echo ""
echo "Now run the ultra-fast build:"
echo "  chmod +x ultra-fast-macos.sh"
echo "  ./ultra-fast-macos.sh"
