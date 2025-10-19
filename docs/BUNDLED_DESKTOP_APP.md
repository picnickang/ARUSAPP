# Bundled Desktop Application Guide

**Desktop app with Express server bundled inside - completely standalone!**

---

## 🎯 What's Different?

### Original Version
- Electron app launches
- Spawns separate Node.js process for server
- Two processes running

### Bundled Version ✨
- Electron app launches
- Server runs **inside** the Electron app
- Single integrated process
- **No external dependencies**

---

## 🚀 Building the Bundled Version

### macOS

```bash
./build-desktop-macos-bundled.sh
```

Creates: `dist/installers/ARUS-1.0.0.dmg` (fully standalone)

### Windows

```bash
./build-desktop-windows-bundled.sh
```

Creates: `dist/installers/ARUS-Setup-1.0.0.exe` (fully standalone)

### Linux

```bash
./build-desktop-linux-bundled.sh
```

Creates: `dist/installers/ARUS-1.0.0.AppImage` (fully standalone)

---

## ✨ Key Improvements

### Before (Separate Server)
```
User launches ARUS.app
  ↓
Electron starts
  ↓
Spawns node process for server
  ↓
Two processes running (Electron + Node)
  ↓
If server crashes, app breaks
```

### After (Bundled Server)
```
User launches ARUS.app
  ↓
Electron starts
  ↓
Server code runs in same process
  ↓
Single integrated application
  ↓
More reliable, simpler
```

---

## 🔧 Technical Changes

### 1. Server Import Instead of Spawn

**Before:**
```javascript
serverProcess = spawn('node', [serverPath]);
```

**After:**
```javascript
const serverModule = await import(serverPath);
```

### 2. Proper Resource Paths

```javascript
const serverPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'dist/index.js')
  : path.join(__dirname, '../dist/index.js');
```

### 3. Bundled Dependencies

All necessary dependencies are included:
- Express server code
- SQLite database
- Drizzle ORM
- All business logic

---

## 📦 What's Included

The bundled app contains:
- ✅ Electron frontend (React app)
- ✅ Express backend (API server)
- ✅ SQLite database
- ✅ All node modules needed
- ✅ Complete offline functionality

**Total size:** ~95-100 MB (everything included!)

---

## 🎯 Installation

### macOS

1. Open `ARUS-1.0.0.dmg`
2. Drag ARUS to Applications
3. **First launch:** Right-click → Open (bypass Gatekeeper)
4. **Subsequent launches:** Just double-click

### Windows

1. Run `ARUS-Setup-1.0.0.exe`
2. Follow installer
3. Launch from Start Menu

### Linux

1. Make executable: `chmod +x ARUS-1.0.0.AppImage`
2. Run: `./ARUS-1.0.0.AppImage`

---

## 🐛 Troubleshooting

### App shows blank screen

**Cause:** Server is still starting

**Solution:** Wait 5-10 seconds on first launch

### "Cannot find module" error

**Cause:** Build didn't include all dependencies

**Solution:** Rebuild with bundled script:
```bash
./build-desktop-macos-bundled.sh
```

### Database not found

**Cause:** Database location incorrect

**Solution:** The app creates database in user's home directory:
- **macOS:** `~/Library/Application Support/ARUS/`
- **Windows:** `%APPDATA%/ARUS/`
- **Linux:** `~/.config/ARUS/`

### Server won't start

**Check logs:**
- **macOS:** `~/Library/Logs/ARUS/`
- **Windows:** `%APPDATA%/ARUS/logs/`
- **Linux:** `~/.config/ARUS/logs/`

---

## 🔐 Security & Code Signing

### macOS

For App Store or enterprise distribution:

```bash
# Sign the app
codesign --deep --force --sign "Developer ID Application: Your Name" \
  dist/installers/ARUS.app

# Notarize for Gatekeeper
xcrun notarytool submit dist/installers/ARUS-1.0.0.dmg \
  --apple-id your@email.com \
  --team-id TEAMID \
  --password app-specific-password \
  --wait
```

### Windows

```bash
# Sign with certificate
signtool sign /f certificate.pfx /p password \
  /t http://timestamp.digicert.com \
  dist/installers/ARUS-Setup.exe
```

---

## 📊 Comparison

| Feature | Bundled | Separate Server |
|---------|---------|-----------------|
| Installation | Simple | Simple |
| Dependencies | None | None |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Server restart | Restart app | Kill & respawn |
| Process count | 1 | 2 |
| Memory usage | Lower | Higher |
| Complexity | Lower | Higher |

---

## 🎉 Benefits

### For Users
- ✅ Simpler - just one app
- ✅ More reliable - no separate server process
- ✅ Faster startup - no process spawning
- ✅ Better error handling
- ✅ Cleaner system - one process instead of two

### For Developers
- ✅ Easier debugging - single process
- ✅ Simpler error handling
- ✅ Better resource management
- ✅ Consistent behavior across platforms

---

## 🚀 Deployment

### Single Vessel

```bash
# Build the installer
./build-desktop-macos-bundled.sh

# Copy to vessel
scp dist/installers/ARUS-1.0.0.dmg vessel:/tmp/

# Install on vessel
ssh vessel
open /tmp/ARUS-1.0.0.dmg
# Drag to Applications
```

### Fleet Deployment

```bash
# Build all platforms
./build-desktop-macos-bundled.sh    # macOS
./build-desktop-windows-bundled.sh  # Windows  
./build-desktop-linux-bundled.sh    # Linux

# Deploy with your tool (Jamf, SCCM, Ansible, etc.)
```

---

## 📝 Summary

**The bundled version is the recommended approach** because:

1. **Simpler:** Everything in one package
2. **More reliable:** Single process, better error handling
3. **Easier deployment:** No server configuration needed
4. **Better UX:** Just install and run
5. **Production-ready:** Complete standalone application

**Use this for all production deployments to vessels!**

---

## 🔄 Migration from Separate Server Version

If you already built the separate server version:

1. Rebuild with bundled script
2. Uninstall old version
3. Install new bundled version
4. Database migrates automatically

**No data loss - database is separate from the app!**

---

**Ready to build?** Run `./build-desktop-macos-bundled.sh` and get a fully standalone desktop app!
