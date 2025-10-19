# ARUS Desktop Application

> **Production-Ready v1.0.0** - Standalone macOS application for marine vessel monitoring

## 🚀 Quick Start

### Install

1. Download `ARUS-1.0.0.dmg` (Intel) or `ARUS-1.0.0-arm64.dmg` (Apple Silicon)
2. Open DMG and drag to Applications
3. Right-click → Open (first time only)
4. Dashboard loads automatically!

**No setup. No dependencies. It just works.**

### Build

```bash
# Intel Macs
./build-desktop-macos-bundled.sh

# Apple Silicon (M1/M2/M3)
./build-desktop-macos-arm64.sh

# Both
./build-desktop-macos-universal.sh
```

## ✨ Features

- ✅ **100% Standalone** - No Node.js installation required
- ✅ **Offline-First** - Works without internet
- ✅ **Native Performance** - ARM64 build for Apple Silicon
- ✅ **Auto Log Rotation** - Keeps 20 recent log files
- ✅ **Smart Port Detection** - Clear error messages
- ✅ **System Tray** - Runs in background

## 📦 What's Bundled

- Complete Node.js v20.11 runtime (~60 MB)
- Express server with all dependencies
- SQLite database
- React frontend
- **Total:** ~180-200 MB

## 📚 Documentation

- **[Quick Start Guide](docs/QUICK_START_DESKTOP.md)** - Installation & troubleshooting
- **[Release Notes](docs/DESKTOP_APP_RELEASE_NOTES.md)** - All features & enhancements
- **[Architecture](docs/STANDALONE_APP_ARCHITECTURE.md)** - Technical details
- **[Known Issues](docs/DESKTOP_APP_KNOWN_ISSUES.md)** - Platform-specific notes
- **[Package Verification](docs/INSTALLATION_PACKAGE_VERIFICATION.md)** - Complete structure

## 🎯 Perfect For

- **Vessels** - Offline operation, air-gapped systems
- **Shore offices** - Fast installation, no IT needed
- **Remote locations** - No cloud dependencies

## 🔧 Troubleshooting

### Port 5000 Error
Disable AirPlay Receiver in System Preferences → Sharing

### App Won't Open
Right-click → Open (bypasses Gatekeeper)

### Logs
Check `~/.arus/logs/server-*.log` for details

## 📈 Performance

| Mac Type | Build | Startup | Performance |
|----------|-------|---------|-------------|
| Intel Mac | Intel | 3-5 sec | Native (100%) |
| M1/M2/M3 | ARM64 | 2-4 sec | Native (100%) |
| M1/M2/M3 | Intel | 4-6 sec | Rosetta (~90%) |

## 🚢 Ready for Vessel Deployment

All production requirements met:
- ✅ Zero external dependencies
- ✅ Comprehensive error handling
- ✅ Automatic log management
- ✅ Multi-architecture support
- ✅ Complete documentation

---

**Built with ❤️ for marine vessels worldwide** 🌊
