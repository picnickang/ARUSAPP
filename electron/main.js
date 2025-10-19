/**
 * ARUS Electron Main Process
 * Creates native desktop application with system tray
 */

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
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
  // Server will terminate with the app since it's running in-process
});

// Start the Express server (bundled version)
async function startServer() {
  try {
    // Determine the correct path for bundled vs development
    const isDev = !app.isPackaged;
    const serverPath = isDev 
      ? path.join(__dirname, '../dist/index.js')
      : path.join(process.resourcesPath, 'app/dist/index.js');
    
    console.log('[Electron] Starting server from:', serverPath);
    console.log('[Electron] Is packaged:', app.isPackaged);
    console.log('[Electron] Resources path:', process.resourcesPath);
    
    // Set environment variables for server
    process.env.LOCAL_MODE = 'true';  // Always use vessel mode for Electron
    process.env.NODE_ENV = 'production';
    process.env.PORT = SERVER_PORT.toString();
    
    // Import and start the server directly (no spawn)
    const serverModule = await import(serverPath);
    
    console.log('[Electron] Server started successfully on port', SERVER_PORT);
  } catch (error) {
    console.error('[Electron] Failed to start server:', error);
    
    // Show error dialog to user
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Server Start Failed',
      `Failed to start ARUS server:\n${error.message}\n\nPlease check the logs and try again.`
    );
  }
}

// Create the browser window
function createWindow() {
  // Wait for server to be ready
  setTimeout(() => {
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
  }, 2000); // Give server 2 seconds to start
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
  await startServer();
  
  // Create main window
  createWindow();
  
  // Create system tray
  createTray();
});
