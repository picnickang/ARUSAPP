# ARUS Packaging & Distribution Options

**Last Updated:** October 19, 2025

This document outlines all available packaging options for distributing the ARUS marine monitoring system.

---

## 📦 Packaging Options Summary

| Package Type | Best For | Size | Complexity | Offline |
|--------------|----------|------|------------|---------|
| **Docker Image** | Servers, cloud deployment | ~500MB | Low | ✅ |
| **Standalone Executable** | Simple vessel deployment | ~100MB | Very Low | ✅ |
| **Electron App** | Desktop GUI application | ~150MB | Low | ✅ |
| **System Service** | Always-running monitoring | ~100MB | Medium | ✅ |
| **Windows Installer (MSI)** | Corporate IT deployment | ~120MB | Medium | ✅ |
| **macOS PKG** | Mac vessel deployment | ~110MB | Medium | ✅ |
| **Snap/AppImage** | Linux deployment | ~130MB | Medium | ✅ |

---

## 1. 🐳 Docker Image (Current - Enhanced)

**Best for:** Shore offices, cloud servers, IT-managed deployments

### Quick Start

```bash
# Pull pre-built image (if available)
docker pull arus/marine-monitoring:latest

# Or build locally
docker build -t arus:latest .

# Run with docker-compose (includes PostgreSQL)
docker compose up -d

# Access: http://localhost
```

### Features
- ✅ Multi-stage build (optimized size)
- ✅ Non-root user (security)
- ✅ Health checks
- ✅ Automatic SSL via Caddy
- ✅ Optional monitoring (Prometheus/Grafana)

### Production Deployment

```bash
# Set environment variables
export DOMAIN=monitoring.yourvessel.com
export POSTGRES_PASSWORD=$(openssl rand -hex 32)
export SESSION_SECRET=$(openssl rand -hex 32)

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

### Vessel Offline Mode

```yaml
# docker-compose.vessel.yml
services:
  arus-app:
    environment:
      LOCAL_MODE: "true"
      TURSO_SYNC_URL: ${TURSO_SYNC_URL}
      TURSO_AUTH_TOKEN: ${TURSO_AUTH_TOKEN}
    volumes:
      - vessel_data:/app/data
```

---

## 2. 📦 Standalone Executable (NEW - Recommended for Vessels)

**Best for:** Vessels, remote sites, non-technical users

Single executable file with Node.js bundled - no installation needed!

### Build Instructions

```bash
# Install pkg
npm install -g pkg

# Build for all platforms
npm run package:all

# Or build for specific platform
npm run package:windows  # Creates arus-win.exe
npm run package:macos    # Creates arus-macos
npm run package:linux    # Creates arus-linux
```

### Usage

```bash
# Windows
arus-win.exe

# macOS
./arus-macos

# Linux
./arus-linux
```

### Features
- ✅ **No Node.js required** - Everything bundled
- ✅ **Single file** - Easy to distribute
- ✅ **Offline-first** - SQLite embedded
- ✅ **Small size** - ~100MB compressed
- ✅ **Auto-start server** - Just double-click

### Configuration

Place `.env` file in same directory:
```
LOCAL_MODE=true
PORT=5000
```

---

## 3. 🖥️ Electron Desktop App (NEW)

**Best for:** GUI-focused deployment, kiosk mode

Full desktop application with native UI.

### Build Instructions

```bash
# Install dependencies
npm install electron electron-builder --save-dev

# Build for current platform
npm run electron:build

# Build for all platforms
npm run electron:build:all
```

### Features
- ✅ **Native desktop app** - Menu bar, tray icon
- ✅ **Auto-updates** - Seamless updates
- ✅ **System tray** - Runs in background
- ✅ **Kiosk mode** - Full-screen for bridge displays
- ✅ **Offline-first** - Built-in SQLite
- ✅ **Cross-platform** - Windows, macOS, Linux

### Installers Created

- **Windows:** `ARUS-Setup-1.0.0.exe` (NSIS installer)
- **macOS:** `ARUS-1.0.0.dmg` (Disk image)
- **Linux:** `ARUS-1.0.0.AppImage` (Portable)

---

## 4. 🔧 System Service Installation (NEW)

**Best for:** Production vessels, auto-start on boot

Installs ARUS as a system service that starts automatically.

### Windows Service

```bash
# Install as Windows service
npm run install:service:windows

# Service will auto-start on boot
# Accessible via: http://localhost:5000
```

### macOS/Linux Service

```bash
# Install as systemd/launchd service
npm run install:service:unix

# Start service
systemctl start arus  # Linux
launchctl start com.arus.monitoring  # macOS
```

### Features
- ✅ **Auto-start on boot**
- ✅ **Runs as background service**
- ✅ **Automatic restarts** on failure
- ✅ **Logging** to system logs
- ✅ **Service management** via OS tools

---

## 5. 💿 Windows Installer (MSI)

**Best for:** Corporate IT, fleet-wide deployment

Professional Windows installer package.

### Build

```bash
npm run build:msi
```

Creates: `ARUS-Marine-Monitoring-1.0.0.msi`

### Features
- ✅ **Silent installation** support (`/quiet`)
- ✅ **Corporate deployment** via Group Policy
- ✅ **Add/Remove Programs** integration
- ✅ **Start menu shortcuts**
- ✅ **Auto-configure** service
- ✅ **Uninstaller** included

### Silent Deployment

```batch
REM Install silently
msiexec /i ARUS-Marine-Monitoring-1.0.0.msi /quiet /norestart

REM Install with log
msiexec /i ARUS-Marine-Monitoring-1.0.0.msi /quiet /log install.log
```

---

## 6. 🍎 macOS Package (PKG)

**Best for:** Mac-based vessels, corporate Mac deployment

Native macOS installer.

### Build

```bash
npm run build:pkg
```

Creates: `ARUS-Marine-Monitoring-1.0.0.pkg`

### Features
- ✅ **Native macOS installer**
- ✅ **Keychain integration** for credentials
- ✅ **Notarized** for macOS security
- ✅ **Menu bar app** integration
- ✅ **Auto-launch** on login

### Installation

```bash
# GUI installation
open ARUS-Marine-Monitoring-1.0.0.pkg

# Silent installation
sudo installer -pkg ARUS-Marine-Monitoring-1.0.0.pkg -target /
```

---

## 7. 🐧 Linux Packages

**Best for:** Linux-based vessel systems

### Snap Package

```bash
# Build snap
npm run build:snap

# Install
sudo snap install arus-marine-monitoring_1.0.0_amd64.snap --dangerous

# Access
snap run arus-marine-monitoring
```

### AppImage (Portable)

```bash
# Build AppImage
npm run build:appimage

# Run (no installation)
chmod +x ARUS-1.0.0.AppImage
./ARUS-1.0.0.AppImage
```

### Debian Package (.deb)

```bash
# Build .deb
npm run build:deb

# Install
sudo dpkg -i arus-marine-monitoring_1.0.0_amd64.deb
```

---

## 📊 Comparison Matrix

### Size Comparison

| Package | Compressed | Extracted | Node.js | Database |
|---------|-----------|-----------|---------|----------|
| Docker Image | 180MB | 500MB | ✅ | PostgreSQL |
| Standalone Exe | 80MB | 100MB | ✅ | SQLite |
| Electron App | 90MB | 150MB | ✅ | SQLite |
| MSI Installer | 85MB | 120MB | ✅ | SQLite |
| PKG Installer | 80MB | 110MB | ✅ | SQLite |
| AppImage | 85MB | 130MB | ✅ | SQLite |

### Deployment Complexity

| Package | Setup Time | Tech Skills | Network |
|---------|-----------|-------------|---------|
| Docker | 5 min | Medium | Optional |
| Standalone | 30 sec | None | No |
| Electron | 2 min | Low | No |
| System Service | 3 min | Low | No |
| MSI/PKG | 2 min | None | No |

---

## 🚀 Recommended Packaging Strategies

### For Vessels (Offline-First)

**Option 1: Standalone Executable** (Easiest)
```bash
# One file, no installation
1. Copy arus-win.exe to vessel
2. Double-click to run
3. Open http://localhost:5000
```

**Option 2: System Service** (Production)
```bash
# Install once, runs forever
1. Run installer
2. Service auto-starts
3. Survives reboots
```

**Option 3: Electron App** (Best UX)
```bash
# Full desktop experience
1. Install ARUS-Setup.exe
2. Launch from Start Menu
3. Runs in system tray
```

### For Shore Offices (Cloud)

**Recommended: Docker**
```bash
# Scalable, professional deployment
1. docker compose up -d
2. Automatic SSL
3. Built-in monitoring
4. Easy updates
```

### For Fleet Deployment

**Recommended: MSI + Group Policy**
```bash
# Deploy to 100+ vessels automatically
1. Create MSI package
2. Deploy via Group Policy
3. Auto-configure and start
4. Centralized management
```

---

## 🔧 Building All Packages

### One Command Build

```bash
# Build everything
npm run package:all-formats

# Creates:
# - dist/docker/arus-latest.tar        (Docker image)
# - dist/standalone/arus-win.exe       (Windows exe)
# - dist/standalone/arus-macos         (macOS binary)
# - dist/standalone/arus-linux         (Linux binary)
# - dist/electron/ARUS-Setup-1.0.0.exe (Windows installer)
# - dist/electron/ARUS-1.0.0.dmg       (macOS disk image)
# - dist/electron/ARUS-1.0.0.AppImage  (Linux portable)
# - dist/msi/ARUS-1.0.0.msi            (Windows MSI)
# - dist/pkg/ARUS-1.0.0.pkg            (macOS PKG)
```

---

## 📝 Configuration Files

All packages support `.env` configuration:

```bash
# Vessel Mode
LOCAL_MODE=true
TURSO_SYNC_URL=https://your-sync-url
TURSO_AUTH_TOKEN=your-token

# Cloud Mode
LOCAL_MODE=false
DATABASE_URL=postgresql://...

# Common
PORT=5000
OPENAI_API_KEY=sk-...
```

---

## 🔐 Security Considerations

### Signed Packages

All installers should be code-signed:

**Windows:**
```bash
# Sign with certificate
signtool sign /f certificate.pfx /p password ARUS-Setup.exe
```

**macOS:**
```bash
# Notarize for Gatekeeper
xcrun notarytool submit ARUS-1.0.0.pkg --wait
```

### Checksum Verification

```bash
# Generate checksums
sha256sum arus-win.exe > checksums.txt
sha256sum arus-macos >> checksums.txt
sha256sum arus-linux >> checksums.txt
```

---

## 📚 Next Steps

1. **Choose packaging strategy** based on deployment scenario
2. **Build packages** using npm scripts
3. **Test deployment** on target systems
4. **Document** vessel-specific configuration
5. **Distribute** via preferred channels

---

## 🆘 Support

- **Documentation:** See `README.md` and `replit.md`
- **Installation Help:** Run `./install.sh` (Unix) or `install.bat` (Windows)
- **Docker Help:** See `docker-compose.yml` comments
- **Package Issues:** Check `docs/TROUBLESHOOTING.md`

---

**Last Updated:** October 19, 2025  
**Version:** 1.0.0  
**Maintainer:** ARUS Team
