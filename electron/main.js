/**
 * ARUS Electron Main Process
 * Creates native desktop application with system tray
 */

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

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

// Start the Express server (bundled version - spawned as separate process)
function startServer() {
  try {
    // Determine the correct path for bundled vs development
    const isDev = !app.isPackaged;
    const serverPath = isDev 
      ? path.join(__dirname, '../dist/index.js')
      : path.join(process.resourcesPath, 'app/dist/index.js');
    
    console.log('[Electron] Starting server from:', serverPath);
    console.log('[Electron] Is packaged:', app.isPackaged);
    if (app.isPackaged) {
      console.log('[Electron] Resources path:', process.resourcesPath);
    }
    
    // Spawn Node.js process to run the server
    // Use system Node.js or bundled Node from Electron
    const nodePath = process.env.NODE_PATH || 'node';
    
    serverProcess = spawn(nodePath, [serverPath], {
      env: {
        ...process.env,
        LOCAL_MODE: 'true',  // Always use vessel mode for Electron
        NODE_ENV: 'production',
        PORT: SERVER_PORT.toString()
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Log server output
    serverProcess.stdout.on('data', (data) => {
      console.log('[Server]', data.toString().trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });
    
    serverProcess.on('error', (error) => {
      console.error('[Electron] Failed to start server:', error);
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Server Start Failed',
        `Failed to start ARUS server:\n${error.message}\n\nPlease check the logs and try again.`
      );
    });
    
    serverProcess.on('close', (code) => {
      console.log(`[Electron] Server process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        const { dialog } = require('electron');
        dialog.showErrorBox(
          'Server Crashed',
          `ARUS server stopped unexpectedly (exit code: ${code})\n\nThe application will now close.`
        );
        app.quit();
      }
    });
    
    console.log('[Electron] Server process started successfully');
  } catch (error) {
    console.error('[Electron] Failed to start server:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Server Start Failed',
      `Failed to start ARUS server:\n${error.message}\n\nPlease check the logs and try again.`
    );
  }
}

// Check if server is ready
function checkServerReady(retries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(`[Electron] Checking server readiness (attempt ${attempts}/${retries})...`);
      
      const req = http.get(`http://localhost:${SERVER_PORT}/`, (res) => {
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
    // Wait for server to be ready with health checks
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

    // Load the app
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    
    // Handle failed load - retry
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Electron] Failed to load:', errorDescription);
      if (errorCode === -102) { // ERR_CONNECTION_REFUSED
        console.log('[Electron] Retrying in 2 seconds...');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
          }
        }, 2000);
      }
    });
    
    // Success handler
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Electron] Dashboard loaded successfully');
    });
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    // Handle window close - minimize to tray instead
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
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Server Not Ready',
      `ARUS server did not start in time.\n\n${error.message}\n\nPlease try restarting the application.`
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
        require('electron').shell.openExternal(`http://localhost:${SERVER_PORT}`);
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
  
  // Double-click tray icon to show window
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
  // Start backend server
  startServer();
  
  // Create main window (waits for server to be ready)
  await createWindow();
  
  // Create system tray
  createTray();
});
