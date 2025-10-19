# ARUS Desktop Application

**Marine Vessel Monitoring - Standalone Desktop App**

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18 or later** - [Download here](https://nodejs.org)
- macOS 10.13+ / Windows 10+ / Linux (64-bit)

### Installation

1. **Download** the installer for your platform:
   - macOS: `ARUS-1.0.0.dmg`
   - Windows: `ARUS-Setup-1.0.0.exe`
   - Linux: `ARUS-1.0.0.AppImage`

2. **Install:**
   - **macOS:** Open DMG, drag to Applications
   - **Windows:** Run installer, follow prompts
   - **Linux:** Make executable and run
     ```bash
     chmod +x ARUS-1.0.0.AppImage
     ./ARUS-1.0.0.AppImage
     ```

3. **First Launch (macOS only):**
   - Right-click ARUS.app → Open (bypasses Gatekeeper)
   - Subsequent launches: just double-click

4. **The dashboard will open automatically!**

---

## 📋 Features

- ✅ **Offline-first** - works without internet
- ✅ **Local database** - SQLite, fast and reliable
- ✅ **Real-time monitoring** - equipment health, telemetry
- ✅ **Predictive maintenance** - ML-powered failure prediction
- ✅ **Work order management** - complete maintenance workflows
- ✅ **Crew scheduling** - STCW-compliant rest hours
- ✅ **Inventory tracking** - parts management
- ✅ **System tray** - runs in background

---

## 🖥️ System Requirements

### Minimum
- **RAM:** 512 MB
- **Disk:** 500 MB
- **CPU:** Dual-core processor
- **OS:**
  - macOS 10.13 (High Sierra) or later
  - Windows 10 64-bit or later
  - Linux 64-bit (Ubuntu 18.04+, Debian 10+)

### Recommended
- **RAM:** 2 GB
- **Disk:** 2 GB
- **CPU:** Quad-core processor

---

## 🔧 Troubleshooting

### App won't open (macOS)
```bash
# Right-click → Open (first time only)
# Or remove quarantine:
xattr -cr /Applications/ARUS\ Marine\ Monitoring.app
```

### "Node.js not found" error
Install Node.js from https://nodejs.org, then restart the app.

### Dashboard won't load
1. Wait 5-10 seconds (first launch is slower)
2. Check system tray icon → Right-click → Restart Server
3. Check that port 5000 isn't in use by another application

### Database errors
The app creates a database automatically at:
- **macOS:** `~/Library/Application Support/ARUS/`
- **Windows:** `%APPDATA%\ARUS\`
- **Linux:** `~/.config/ARUS/`

To reset: Quit app, delete this folder, restart.

---

## 📁 Data Location

### Database
- **macOS:** `~/Library/Application Support/ARUS/vessel.db`
- **Windows:** `%APPDATA%\ARUS\vessel.db`
- **Linux:** `~/.config/ARUS/vessel.db`

### Logs
- **macOS:** `~/Library/Logs/ARUS/`
- **Windows:** `%APPDATA%\ARUS\logs\`
- **Linux:** `~/.config/ARUS/logs/`

### Backups
Copy the database file to back up all your data.

---

## 🎯 Usage

### Starting the App
- **macOS/Linux:** Double-click in Applications/Programs
- **Windows:** Start Menu → ARUS Marine Monitoring

### System Tray
The app runs in your system tray with these options:
- **Show Dashboard** - Open the main window
- **Open in Browser** - View in your default browser
- **Restart Server** - Restart the backend
- **Quit** - Exit the application

### Closing the App
Closing the window **minimizes to tray**. 
To fully quit: System tray → Quit

---

## 🌐 Accessing from Other Devices

The server runs on `http://localhost:5000`

To access from other devices on your network:
1. Find your computer's IP address
2. On other devices, browse to `http://YOUR_IP:5000`

Example: `http://192.168.1.100:5000`

---

## 🔄 Updates

Currently: Manual updates
1. Download new version
2. Install (replaces old version)
3. Your data is preserved

---

## ⚙️ Advanced

### Development Mode
```bash
# Clone repository
git clone https://github.com/your-org/arus.git
cd arus

# Install dependencies
npm install

# Build
npm run build

# Run
node electron-start.js
```

### Build from Source
```bash
# macOS
./build-desktop-macos-bundled.sh

# Windows (on Windows machine)
./build-desktop-windows.bat

# Linux
./build-desktop-linux.sh
```

### Environment Variables
- `PORT` - Server port (default: 5000)
- `LOCAL_MODE` - Always true for desktop app
- `NODE_ENV` - Set to 'production' automatically

---

## 📞 Support

- **Documentation:** `docs/` folder in installation
- **Issues:** GitHub Issues
- **Email:** support@arus-marine.com

---

## 📄 License

Copyright © 2025 ARUS Team
MIT License

---

## 🎉 Getting Started

After installation, the app will:
1. ✅ Start the server automatically
2. ✅ Open the dashboard
3. ✅ Create a local database
4. ✅ Be ready to use!

**No configuration needed - it just works!**

---

**For vessels:** This app works completely offline. Internet is NOT required for normal operation.

**For shore offices:** You can optionally configure cloud sync to sync data between vessels and shore.
