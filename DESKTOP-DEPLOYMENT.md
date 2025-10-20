# ARUS Desktop Application - Deployment Guide

## Overview

This guide covers building and deploying standalone desktop applications for ARUS Marine Monitoring on **macOS** and **Windows** platforms.

## ⚠️ CRITICAL: Platform-Specific Builds Required

**You MUST build each platform on its native operating system.**

### Why Platform-Specific Builds?

ARUS uses native Node.js modules that contain platform-specific binary code:

| Module | Purpose | Platform Binary |
|--------|---------|----------------|
| `serialport` | J1939/J1708 marine protocols | Platform-specific `.node` |
| `@libsql/client` | SQLite for vessel deployments | Platform-specific bindings |
| `@tensorflow/tfjs-node` | ML-based predictive maintenance | Platform-specific TensorFlow |
| `better-sqlite3` | Database operations | Platform-specific `.node` |

**Consequences of Cross-Platform Building:**
- ❌ App crashes on launch with `Module did not self-register`
- ❌ Serial port communication fails completely
- ❌ Database operations crash
- ❌ ML predictions unavailable

## Quick Start

### Building for macOS
**Required:** macOS computer (Intel or Apple Silicon)

```bash
# See BUILD-MACOS.md for detailed instructions
./build-desktop-macos-bundled.sh
```

**Output:** `dist/installers/ARUS-Marine-Monitoring-1.0.0-mac.tar.gz` (~500-800 MB)

### Building for Windows
**Required:** Windows 10/11 computer (64-bit)

```powershell
# See BUILD-WINDOWS.md for detailed instructions
.\build-desktop-windows-bundled.sh
```

**Output:** `dist/installers/ARUS-Marine-Monitoring-1.0.0-windows.tar.gz` (~2-3 GB)

## Build Environment Summary

| Platform | Build On | Requirements | Output Size |
|----------|----------|--------------|-------------|
| **macOS** | macOS 10.13+ | Xcode CLI Tools, Node.js 20 | 500-800 MB |
| **Windows** | Windows 10/11 | Visual Studio Build Tools, Node.js 20 | 2-3 GB |
| ~~Linux~~ | ~~Not Supported~~ | ~~Would produce broken binaries~~ | N/A |

## Architecture

### Application Structure

```
Desktop App
├── Electron Shell (UI)
│   └── Opens browser to localhost:5000
│
└── Spawned Node.js Process (Backend)
    ├── Express Server
    ├── SQLite Database (Vessel Mode)
    ├── ML Prediction Engine
    └── Serial Port Handler
```

### Package Contents

Both platforms include:

```
Resources/
├── app/
│   ├── package.json          # ES module configuration
│   ├── dist/
│   │   └── index.js          # Bundled backend server
│   └── node_modules/         # Platform-native dependencies
├── nodejs/
│   ├── bin/node (macOS)
│   └── node.exe (Windows)
└── app.asar                  # Electron UI code
```

## Key Differences: macOS vs Windows

| Aspect | macOS | Windows |
|--------|-------|---------|
| **Executable** | `.app` bundle | `.exe` |
| **Node.js Path** | `Resources/nodejs/bin/node` | `Resources/nodejs/node.exe` |
| **Lib Paths** | `DYLD_LIBRARY_PATH` | `PATH` environment variable |
| **Package Format** | `.tar.gz` or `.dmg` | `.tar.gz` or `.zip` |
| **Code Signing** | Apple Developer cert | Authenticode cert |
| **Size** | 500-800 MB | 2-3 GB (TensorFlow larger) |

## Detailed Build Instructions

### For macOS → See [BUILD-MACOS.md](./BUILD-MACOS.md)
- Prerequisites and setup
- Step-by-step build process
- Testing and verification
- Distribution options
- Troubleshooting

### For Windows → See [BUILD-WINDOWS.md](./BUILD-WINDOWS.md)
- Prerequisites and setup
- Step-by-step build process
- Testing and verification
- Distribution options
- Troubleshooting

## Fixes Implemented (Already in Codebase)

### ✅ Fix 1: ES Module Configuration
**Problem:** `SyntaxError: Cannot use import statement outside a module`

**Solution:** Added `app/package.json` with `"type": "module"`

**File:** `electron/app-package/package.json`

### ✅ Fix 2: Node.js Runtime Bundling
**Problem:** `spawn node ENOENT` (Windows), missing Node.js runtime

**Solution:** Bundle complete Node.js v20.11 runtime for each platform

**Files:**
- `electron/nodejs/` - macOS runtime (165 MB)
- `electron/nodejs-windows/` - Windows runtime (85 MB)

### ✅ Fix 3: node_modules Accessibility
**Problem:** Dependencies in `.asar` inaccessible to spawned Node.js process

**Solution:** Copy node_modules to `app/node_modules` via extraResources

**File:** `electron-builder.yml`

### ✅ Fix 4: Platform-Specific Paths
**Problem:** Different paths for Node.js executable on each platform

**Solution:** Platform detection and path resolution in Electron main process

**File:** `electron/main.js`

## Distribution Checklist

Before deploying to vessels:

### Pre-Distribution Testing

- [ ] Built on native platform (macOS for macOS, Windows for Windows)
- [ ] App launches without errors
- [ ] Dashboard loads at `http://localhost:5000`
- [ ] SQLite database created successfully
- [ ] Serial port detection works (if hardware available)
- [ ] ML predictions functional
- [ ] No `Module not found` errors in logs
- [ ] Native modules load correctly
- [ ] Offline operation confirmed (disconnect network)

### Security (Optional but Recommended)

- [ ] Code signing certificate applied
- [ ] Virus scan clean (Windows)
- [ ] Gatekeeper approved (macOS)
- [ ] Installer tested on clean machine

### Documentation

- [ ] Installation instructions provided
- [ ] Troubleshooting guide included
- [ ] Version number documented
- [ ] Release notes prepared

## Vessel Deployment

### Offline Installation (Recommended)

1. Copy installer to USB drive
2. Transfer to vessel computer
3. Extract and install
4. No internet required after installation

### Configuration

On first run, the app creates:

**macOS:**
```
~/Library/Application Support/ARUS Marine Monitoring/
├── config.json
├── database.db (SQLite)
└── logs/
```

**Windows:**
```
%APPDATA%\ARUS Marine Monitoring\
├── config.json
├── database.db (SQLite)
└── logs\
```

### Database Modes

**Vessel Mode (Offline):**
- Uses local SQLite database
- Full functionality without internet
- Periodic cloud sync (when connected)

**Cloud Mode (Shore Office):**
- Connects to PostgreSQL
- Real-time multi-vessel monitoring
- Central analytics and reporting

## Known Limitations

### 1. Platform-Specific Builds
- ⚠️ Cannot cross-compile from Linux
- ⚠️ Must build on target platform
- ✅ Ensures native modules work correctly

### 2. Package Size
- macOS: 500-800 MB (bundled runtime + dependencies)
- Windows: 2-3 GB (TensorFlow adds ~1 GB)
- Reason: Complete standalone runtime for offline vessels

### 3. Code Signing
- Apps are NOT code-signed by default
- Users may see security warnings
- Solution: Apply code signing certificate (see platform guides)

### 4. Auto-Updates
- Currently NOT implemented
- Manual update process required
- Future: Implement auto-update mechanism

## Support

### Build Issues
- Check platform-specific guide (BUILD-MACOS.md or BUILD-WINDOWS.md)
- Verify all prerequisites installed
- Ensure building on correct platform
- Check build logs for errors

### Runtime Issues
- Check application logs in AppData/Library
- Verify SQLite database created
- Test serial port hardware separately
- Confirm Node.js version compatibility

### Platform-Specific Issues

**macOS:**
- Gatekeeper warnings → See BUILD-MACOS.md Troubleshooting
- Apple Silicon vs Intel → Build for target architecture

**Windows:**
- Windows Defender warnings → Add to exclusions or code-sign
- Missing DLLs → Reinstall Visual C++ Redistributable

## Development vs Production

### Development (Web-Based)
```bash
npm run dev
# Open browser to http://localhost:5000
```

### Production (Desktop App)
```bash
# Build platform-specific installer
./build-desktop-macos-bundled.sh
# or
.\build-desktop-windows-bundled.sh
```

## Version History

**v1.0.0 (Current)**
- Initial desktop application release
- ES module support
- Bundled Node.js runtime
- Platform-native modules
- Offline-first vessel mode

## Roadmap

**Future Enhancements:**
- [ ] Auto-update mechanism
- [ ] Signed installers (macOS + Windows)
- [ ] Reduced package size optimization
- [ ] Linux AppImage support
- [ ] Containerized build environment

---

## Quick Reference

### macOS Build Command
```bash
./build-desktop-macos-bundled.sh
```

### Windows Build Command
```powershell
.\build-desktop-windows-bundled.sh
```

### Output Locations
```
dist/installers/
├── ARUS-Marine-Monitoring-1.0.0-mac.tar.gz      # macOS
└── ARUS-Marine-Monitoring-1.0.0-windows.tar.gz  # Windows
```

### Installation
**macOS:** Extract → Drag to Applications → Launch  
**Windows:** Extract → Run .exe → Dashboard opens

---

**Last Updated:** 2025-10-20  
**Minimum Requirements:** macOS 10.13+ / Windows 10 (64-bit)  
**Node.js Version:** 20.11.0  
**Electron Version:** 33.4.11
