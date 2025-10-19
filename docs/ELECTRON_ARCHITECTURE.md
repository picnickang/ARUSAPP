# Electron Desktop App Architecture

Technical details of how the ARUS desktop application works.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│  ARUS Desktop App (.app / .exe)    │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Electron Main Process       │ │
│  │   (electron/main.js)          │ │
│  │                               │ │
│  │   • Creates BrowserWindow     │ │
│  │   • Spawns Node.js server     │ │
│  │   • Creates system tray       │ │
│  │   • Manages lifecycle         │ │
│  └───────────────────────────────┘ │
│              │                      │
│              ├──── spawns ─────┐    │
│              │                 │    │
│  ┌───────────▼──────────┐  ┌──▼────────────────┐
│  │  Renderer Process    │  │  Node.js Server   │
│  │  (React + Vite)      │  │  (Express)        │
│  │                      │  │                   │
│  │  • Dashboard UI      │  │  • REST API       │
│  │  • Equipment pages   │  │  • SQLite DB      │
│  │  • Work orders       │  │  • ML engine      │
│  │  • Reports           │  │  • Background jobs│
│  └──────────────────────┘  └───────────────────┘
│              │                      │
│              └──── HTTP ───────────┘
│                (localhost:5000)
│
└─────────────────────────────────────┘
```

---

## 📦 What Gets Bundled

### Application Structure
```
ARUS.app/
├── Contents/
│   ├── MacOS/
│   │   └── ARUS Marine Monitoring     # Electron executable
│   ├── Resources/
│   │   ├── electron/
│   │   │   ├── main.js               # Main process
│   │   │   ├── preload.js            # Security bridge
│   │   │   └── icon.png              # App icon
│   │   ├── app/
│   │   │   └── dist/
│   │   │       └── index.js          # Express server (bundled)
│   │   └── node_modules/             # Dependencies
│   └── Info.plist                    # macOS metadata
```

---

## 🔄 Process Architecture

### Why Two Processes?

**Renderer Process (Chromium)**
- Runs the React frontend
- Sandboxed for security
- Can't access Node.js APIs directly
- Limited to web APIs (fetch, DOM, etc.)

**Server Process (Node.js)**
- Runs the Express backend
- Full Node.js access
- Database operations
- File system access
- ML computations

### Communication Flow

```
User clicks "Create Work Order"
         │
         ▼
React form component
         │
         ▼
fetch('http://localhost:5000/api/work-orders', {...})
         │
         ▼
Express server (separate Node.js process)
         │
         ▼
SQLite database
         │
         ▼
Response back to React
         │
         ▼
UI updates
```

---

## 🚀 Startup Sequence

### 1. App Launch
```javascript
// User double-clicks ARUS.app
app.whenReady().then(() => {
  startServer();     // Step 2
  createWindow();    // Step 3
  createTray();      // Step 4
});
```

### 2. Server Start
```javascript
// Spawn Node.js process
serverProcess = spawn(process.execPath, [serverPath], {
  env: {
    LOCAL_MODE: 'true',
    PORT: '5000'
  }
});
```

### 3. Window Creation
```javascript
// Create browser window after 2 second delay
setTimeout(() => {
  mainWindow = new BrowserWindow({...});
  mainWindow.loadURL('http://localhost:5000');
}, 2000);
```

### 4. System Tray
```javascript
// Add to system tray
tray = new Tray(icon);
tray.setContextMenu(contextMenu);
```

---

## 🔐 Security Model

### Context Isolation
```javascript
webPreferences: {
  nodeIntegration: false,      // No Node.js in renderer
  contextIsolation: true,       // Separate contexts
  preload: path.join(__dirname, 'preload.js')
}
```

### Preload Script
Safely exposes only necessary APIs to renderer:
```javascript
// preload.js
contextBridge.exposeInMainWorld('electron', {
  // Only expose safe APIs here
});
```

### Why This Matters
- Prevents XSS attacks from accessing Node.js
- Isolates web content from system
- Follows Electron security best practices

---

## 💾 Data Storage

### SQLite Database Location

**macOS:**
```
~/Library/Application Support/ARUS/vessel.db
```

**Windows:**
```
%APPDATA%\ARUS\vessel.db
```

**Linux:**
```
~/.config/ARUS/vessel.db
```

### Why SQLite?
- ✅ No server required
- ✅ Single file database
- ✅ Perfect for offline operation
- ✅ Fast for vessel deployments
- ✅ Easy backup (just copy the file)

---

## 🌐 Network Architecture

### Offline-First Design

The desktop app works **completely offline**:

```
Internet Connection: NOT REQUIRED

┌─────────────────┐
│  ARUS Desktop   │
│                 │
│  ┌───────────┐  │
│  │  React    │  │
│  └─────┬─────┘  │
│        │        │
│        │ HTTP   │
│        │        │
│  ┌─────▼─────┐  │
│  │  Express  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │  SQLite   │  │
│  └───────────┘  │
│                 │
└─────────────────┘
   All local!
```

### Optional Cloud Sync

If configured with Turso:
```
┌─────────────────┐          ┌──────────────┐
│  ARUS Desktop   │          │  Turso Cloud │
│                 │          │              │
│  Local SQLite   │ ◄─────► │  Replica DB  │
│                 │  Sync    │              │
└─────────────────┘          └──────────────┘
```

---

## 📊 Resource Usage

### Typical Footprint

**Memory:**
- Electron process: ~100 MB
- Server process: ~150 MB
- **Total: ~250 MB**

**Disk:**
- App bundle: ~95-100 MB
- Database: 10-500 MB (varies)
- **Total: ~110-600 MB**

**CPU:**
- Idle: < 1%
- Active use: 5-15%
- ML training: 50-80% (temporary)

---

## 🔧 Development vs Production

### Development Mode
```javascript
const isDev = !app.isPackaged;

if (isDev) {
  // Load from project directory
  serverPath = path.join(__dirname, '../dist/index.js');
  mainWindow.webContents.openDevTools();
}
```

### Production Mode
```javascript
if (app.isPackaged) {
  // Load from app bundle
  serverPath = path.join(process.resourcesPath, 'app/dist/index.js');
  // No DevTools
}
```

---

## 🐛 Debugging

### View Server Logs

The server process outputs to Electron console:
```javascript
serverProcess.stdout.on('data', (data) => {
  console.log('[Server]', data.toString());
});
```

### Enable DevTools
```javascript
// In development
mainWindow.webContents.openDevTools();
```

### Log Locations

**macOS:**
```bash
~/Library/Logs/ARUS/
```

**Windows:**
```
%APPDATA%\ARUS\logs\
```

---

## 🔄 Update Mechanism

### Current Approach
Manual updates:
1. Download new .dmg/.exe
2. Replace old app
3. Database migrates automatically

### Future: Auto-Updates
Can be added using `electron-updater`:
```javascript
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

---

## 🎯 Key Design Decisions

### 1. Why Spawn vs Require?

**Spawn (Current):**
```javascript
✅ Works with ES6 modules
✅ Isolates server crashes
✅ Easier to restart
❌ Slightly higher memory
```

**Require (Attempted):**
```javascript
❌ Doesn't work with ES6 imports
✅ Single process (simpler)
✅ Lower memory
```

**Decision:** Use spawn for reliability.

### 2. Why 2 Second Delay?

```javascript
setTimeout(() => {
  createWindow();
}, 2000);
```

Gives server time to:
- Initialize Express
- Connect to SQLite
- Set up routes
- Start listening

Alternative would be health check polling.

### 3. Why System Tray?

```javascript
// Minimize to tray instead of closing
mainWindow.on('close', (event) => {
  event.preventDefault();
  mainWindow.hide();
});
```

Keeps server running in background for:
- Scheduled maintenance checks
- Continuous telemetry monitoring
- Background ML training

---

## 📈 Performance Optimizations

### 1. Lazy Loading
React components load on-demand.

### 2. Database Indexing
SQLite tables have proper indexes.

### 3. Connection Pooling
Drizzle ORM manages DB connections.

### 4. Asset Optimization
Vite builds optimized bundles.

---

## 🚀 Deployment Workflow

```bash
# 1. Build frontend + backend
npm run build

# 2. Package into Electron
electron-builder --mac dmg

# 3. Result
dist/installers/ARUS-1.0.0.dmg

# 4. Distribute
# Copy to vessel, install, done!
```

---

## 🔒 Production Hardening

### Before Production Release:

1. **Code Signing**
   ```bash
   codesign --deep --force --sign "Developer ID" ARUS.app
   ```

2. **Notarization** (macOS)
   ```bash
   xcrun notarytool submit ARUS.dmg
   ```

3. **Authenticode** (Windows)
   ```bash
   signtool sign /f cert.pfx ARUS.exe
   ```

4. **Remove DevTools**
   ```javascript
   // Never open DevTools in production
   if (process.env.NODE_ENV !== 'development') {
     // webContents.openDevTools() disabled
   }
   ```

5. **Enable CSP**
   ```javascript
   // Content Security Policy
   helmet({
     contentSecurityPolicy: {...}
   })
   ```

---

## 📚 Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 33 |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Backend | Express.js |
| Database | SQLite (via Drizzle ORM) |
| Packaging | electron-builder |
| Icons | lucide-react |
| Styling | Tailwind CSS |

---

**This architecture provides a robust, offline-capable desktop application perfect for vessel deployments!**
