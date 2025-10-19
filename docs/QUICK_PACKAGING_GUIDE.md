# Quick Packaging Guide for ARUS

**TL;DR - Best options for vessel deployment**

---

## 🚀 Fastest: Standalone Executable (Recommended)

**Perfect for vessels - one file, no installation!**

### Build

```bash
chmod +x scripts/package-standalone.sh
./scripts/package-standalone.sh
```

Creates:
- `arus-win-1.0.0.exe` - Windows (~100MB)
- `arus-macos-intel-1.0.0` - macOS Intel (~100MB)
- `arus-macos-arm-1.0.0` - macOS Apple Silicon (~100MB)
- `arus-linux-1.0.0` - Linux (~100MB)

### Deploy to Vessel

```bash
# 1. Copy executable to vessel
scp dist/standalone/arus-win-1.0.0.exe vessel:/opt/arus/

# 2. Copy .env configuration
scp .env vessel:/opt/arus/

# 3. Run on vessel
ssh vessel
cd /opt/arus
./arus-win-1.0.0.exe
```

That's it! No Node.js, no npm, no dependencies.

---

## 🐳 Docker (Best for Shore Offices)

**Already configured! Just use what you have:**

```bash
# Build
docker build -t arus:latest .

# Run with PostgreSQL
docker compose up -d

# Access
open http://localhost
```

---

## 🖥️ Electron Desktop App (Best UX)

**Native desktop application with GUI**

### Setup

```bash
# Install dependencies
npm install electron electron-builder electron-is-dev --save-dev
```

### Build

```bash
# Build for current platform
npx electron-builder

# Build for all platforms (requires macOS)
npx electron-builder -mwl
```

Creates installers in `dist/`:
- `ARUS-Setup-1.0.0.exe` - Windows installer
- `ARUS-1.0.0.dmg` - macOS disk image
- `ARUS-1.0.0.AppImage` - Linux portable app

### Features

- ✅ Runs in system tray
- ✅ Auto-start on login
- ✅ No terminal needed
- ✅ Native desktop experience

---

## 📦 All Packages at Once

Build everything:

```bash
chmod +x scripts/package-all.sh
./scripts/package-all.sh
```

Creates:
- Standalone executables (Windows, macOS, Linux)
- Docker image
- Electron desktop apps
- Checksums for verification

---

## 🎯 Which Package Should I Use?

### For Vessels (Offline Operation)

**Recommended:** Standalone Executable
- ✅ Simplest deployment
- ✅ One file, no installation
- ✅ Works offline immediately
- ✅ ~100MB per platform

**Alternative:** Electron App
- ✅ Better user experience
- ✅ Native desktop app
- ✅ System tray integration
- ✅ ~150MB installed

### For Shore Offices (Always Online)

**Recommended:** Docker
- ✅ Already configured
- ✅ Easy updates
- ✅ Automatic SSL
- ✅ Built-in monitoring

### For Fleet Deployment (Many Vessels)

**Recommended:** Standalone Executable + Ansible/SSH
- ✅ Easy to distribute
- ✅ Scriptable deployment
- ✅ No dependencies
- ✅ Consistent across fleet

---

## 📝 Running Packaging Scripts

All packaging is done via shell scripts (no package.json modification needed):

```bash
# Build standalone executables
./scripts/package-standalone.sh

# Build all packages
./scripts/package-all.sh

# Build Electron app (after installing electron-builder)
npx electron-builder

# Build Docker
docker build -t arus:latest .
```

---

## 🔐 Code Signing (Production)

### Windows

```bash
# Sign executable
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist/standalone/arus-win.exe
```

### macOS

```bash
# Sign and notarize
codesign --deep --force --sign "Developer ID" dist/standalone/arus-macos
xcrun notarytool submit dist/standalone/arus-macos.zip --wait
```

---

## 📊 Package Size Comparison

| Package Type | Size (Compressed) | Size (Installed) |
|--------------|-------------------|------------------|
| Standalone Exe | 80MB | 100MB |
| Electron App | 90MB | 150MB |
| Docker Image | 180MB | 500MB |

---

## 🆘 Troubleshooting

### "pkg: command not found"

```bash
npm install -g pkg
```

### "electron-builder not found"

```bash
npm install -g electron-builder
```

### Permission denied on scripts

```bash
chmod +x scripts/*.sh
```

### Docker build fails

```bash
# Make sure Docker daemon is running
docker ps

# Try with sudo
sudo docker build -t arus:latest .
```

---

## 📚 Full Documentation

See `docs/PACKAGING_OPTIONS.md` for comprehensive packaging guide including:
- System service installation
- Windows MSI installers
- macOS PKG packages
- Linux Snap/AppImage
- Fleet deployment strategies

---

**Quick Start:** Run `./scripts/package-standalone.sh` and distribute the executables!
