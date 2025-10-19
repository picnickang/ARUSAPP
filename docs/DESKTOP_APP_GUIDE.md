# ARUS Desktop Application Guide

**Run ARUS as a native desktop app - no browser needed!**

---

## ✨ What You Get

The desktop app provides:
- ✅ **Native window** - No browser tabs needed
- ✅ **System tray icon** - Minimize to background
- ✅ **Auto-start** - Optionally launch on login
- ✅ **Offline-first** - Built-in SQLite database
- ✅ **Professional** - Feels like a real desktop application

---

## 🚀 Quick Start (Development Mode)

### Option 1: Using the Launcher Script

```bash
# Just run this!
node electron-start.js
```

The desktop app will open automatically.

### Option 2: Manual Launch

```bash
# Build the app first
npm run build

# Start Electron
npx electron electron/main.js
```

---

## 📦 Build Standalone Desktop App (Distribution)

Build installers for Windows, macOS, and Linux:

```bash
# Build for your current platform
npm run build  # Build the app first
npx electron-builder

# Build for all platforms (requires macOS)
npx electron-builder -mwl
```

### Output Files

After building, you'll get installers in `dist/electron/`:

**Windows:**
- `ARUS-Setup-1.0.0.exe` - Installer (recommended)
- `ARUS-1.0.0.exe` - Portable version

**macOS:**
- `ARUS-1.0.0.dmg` - Disk image installer
- `ARUS-1.0.0.zip` - ZIP archive

**Linux:**
- `ARUS-1.0.0.AppImage` - Portable (no installation)
- `arus-marine-monitoring_1.0.0_amd64.deb` - Debian/Ubuntu package

---

## 💾 Installation

### Windows
1. Double-click `ARUS-Setup-1.0.0.exe`
2. Follow the installer
3. Launch from Start Menu

### macOS
1. Open `ARUS-1.0.0.dmg`
2. Drag app to Applications folder
3. Launch from Applications

### Linux
1. Make executable: `chmod +x ARUS-1.0.0.AppImage`
2. Run: `./ARUS-1.0.0.AppImage`

Or install .deb package:
```bash
sudo dpkg -i arus-marine-monitoring_1.0.0_amd64.deb
```

---

## 🎯 Features

### System Tray

The app runs in your system tray with these options:
- **Show Dashboard** - Open the main window
- **Open in Browser** - Launch in default browser
- **Restart Server** - Restart the backend
- **Quit** - Close the application

### Minimize to Tray

Click the **X** button to minimize to tray (app keeps running in background). Use the tray menu to quit completely.

### Auto-Start on Login

After installing, you can configure the app to start automatically when you log in:

**Windows:** Check "Launch at startup" in installer

**macOS:** System Preferences → Users & Groups → Login Items → Add ARUS

**Linux:** Add to startup applications in your desktop environment

---

## ⚙️ Configuration

The desktop app uses `.env` file in the project root for configuration:

```bash
# Vessel mode (offline-first with SQLite)
LOCAL_MODE=true
PORT=5000

# Cloud mode (PostgreSQL)
LOCAL_MODE=false
DATABASE_URL=postgresql://...

# Optional: OpenAI for AI features
OPENAI_API_KEY=sk-...
```

---

## 🔧 Development

### File Structure

```
electron/
├── main.js      - Main process (window management, server)
├── preload.js   - Security bridge
└── icon.png     - App icon

electron-builder.yml  - Build configuration
electron-start.js     - Development launcher
```

### How It Works

1. **Main Process** (`electron/main.js`)
   - Starts Express server automatically
   - Creates native window
   - Manages system tray
   - Handles window events

2. **Renderer Process** (your React app)
   - Loads from `http://localhost:5000`
   - Full access to all ARUS features
   - Isolated from Node.js for security

3. **Server** (automatic)
   - Starts with the app
   - Runs in background
   - Shuts down when app closes

---

## 🐛 Troubleshooting

### "Cannot find module 'electron'"

```bash
npm install electron electron-builder --save-dev
```

### Server won't start

Make sure the app is built first:
```bash
npm run build
```

### Port already in use

Change the port in `.env`:
```
PORT=5001
```

### App won't open (macOS)

Right-click the app → Open → Confirm

Or disable Gatekeeper for this app:
```bash
xattr -cr /Applications/ARUS.app
```

### Black screen on launch

Wait 2-3 seconds for the server to start. If it persists, check logs:

**Windows:** `%APPDATA%\ARUS\logs\`
**macOS:** `~/Library/Logs/ARUS/`
**Linux:** `~/.config/ARUS/logs/`

---

## 📊 Size Comparison

| Package Type | Size | Installation |
|--------------|------|--------------|
| Windows Installer | ~90MB | Yes |
| Windows Portable | ~100MB | No |
| macOS DMG | ~95MB | Yes |
| Linux AppImage | ~100MB | No |

---

## 🆚 Desktop App vs. Browser

| Feature | Desktop App | Browser |
|---------|-------------|---------|
| Installation | One-time install | None |
| System Tray | ✅ Yes | ❌ No |
| Auto-start | ✅ Yes | ❌ No |
| Native Feel | ✅ Yes | ⚠️ Limited |
| Updates | Auto or manual | Reload page |
| Background Mode | ✅ Minimizes to tray | ❌ Must keep tab open |

---

## 🚀 Deployment

### Single Vessel

1. Build the installer
2. Copy to vessel
3. Install and configure

### Fleet Deployment

Use the installers with your deployment tool:

**Windows (Group Policy):**
```batch
msiexec /i ARUS-Setup.exe /quiet /norestart
```

**macOS (Jamf):**
```bash
sudo installer -pkg ARUS.pkg -target /
```

**Linux (Ansible):**
```yaml
- name: Install ARUS
  apt:
    deb: /tmp/arus-marine-monitoring.deb
```

---

## 📝 Summary

**To run the desktop app right now:**
```bash
node electron-start.js
```

**To build installers for distribution:**
```bash
npm run build
npx electron-builder
```

**Result:** Native desktop application that runs independently - no browser needed!

---

## 🆘 Need Help?

- **Check logs:** See troubleshooting section above
- **Rebuild:** `npm run build && npx electron-builder`
- **Development mode:** `node electron-start.js`
- **Documentation:** See `docs/PACKAGING_OPTIONS.md`

---

**The desktop app gives you the best of both worlds: the power of a web app with the convenience of a native desktop application!**
