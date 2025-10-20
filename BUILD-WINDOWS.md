# Building ARUS for Windows

This guide explains how to build the ARUS Marine Monitoring desktop application **on a Windows machine**.

## ⚠️ CRITICAL: Why Build on Windows?

The application uses native Node.js modules that must be compiled for the target platform:
- `serialport` - Marine protocol communications (J1939, J1708, J1587)
- `@libsql/client` - SQLite database for vessel deployments
- `@tensorflow/tfjs-node` - Machine learning predictions
- `better-sqlite3` - Database operations

**Building on Linux produces Linux binaries that will crash on Windows.**

## Prerequisites

### 1. Hardware Requirements
- **Windows 10 (64-bit) or Windows 11**
- **8 GB RAM minimum** (16 GB recommended)
- **10 GB free disk space**

### 2. Software Requirements

Install the following tools in order:

#### a) Visual Studio Build Tools

Native modules require C++ build tools.

**Download:** https://visualstudio.microsoft.com/downloads/

**Install:** "Build Tools for Visual Studio 2022"

During installation, select:
- ✅ Desktop development with C++
- ✅ Windows 10 SDK (or Windows 11 SDK)

**Alternative (command line):**
```powershell
# Using Chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

#### b) Node.js v20.x

**Download:** https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi

**Install:** Run installer with default options

**Verify:**
```powershell
node --version
# Expected: v20.11.0 (or v20.x.x)

npm --version
# Expected: 10.x.x
```

#### c) Git for Windows

**Download:** https://git-scm.com/download/win

**Install:** Use default options

#### d) Python 3.x (for native module compilation)

**Download:** https://www.python.org/downloads/

**Install:** Check "Add Python to PATH" during installation

**Verify:**
```powershell
python --version
# Expected: Python 3.x.x
```

#### e) Windows Build Tools (Alternative)

If you prefer a simpler setup:

```powershell
# Run PowerShell as Administrator
npm install --global windows-build-tools
```

This installs Python and Visual C++ Build Tools automatically.

## Build Process

### Step 1: Open PowerShell as Administrator

Right-click PowerShell → "Run as Administrator"

### Step 2: Clone or Download Repository

```powershell
# If using git
git clone <your-repository-url>
cd <repository-name>

# Or extract from archive
# Right-click ZIP → Extract All
cd arus
```

### Step 3: Install Dependencies

```powershell
# Install ALL dependencies (including devDependencies for building)
npm install

# This will compile native modules for Windows
```

**Expected duration:** 5-15 minutes

**Note:** You may see compilation warnings for native modules - this is normal.

### Step 4: Build the Application

```powershell
# Build frontend and backend
npm run build
```

**Expected output:**
- `dist\public\` - Frontend assets
- `dist\index.js` - Backend server (2-3 MB)

### Step 5: Build Windows Desktop Application

```powershell
# Make script executable and run
.\build-desktop-windows-bundled.sh

# If you get execution policy error:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\build-desktop-windows-bundled.sh
```

**Alternative (if bash script doesn't work on Windows):**

Use the Node.js-based builder:

```powershell
# Build Windows installer
npm run electron:build:win
```

**This will:**
1. Download Node.js v20.11 runtime for Windows (if not already present)
2. Create a clean build environment
3. Install production dependencies (with Windows-native modules)
4. Package the application with electron-builder
5. Create distributable archives

**Expected duration:** 10-20 minutes

**Expected output:**
```
dist\installers\
├── ARUS-Marine-Monitoring-1.0.0-windows.tar.gz  (~2-3 GB)
└── ARUS Marine Monitoring Setup 1.0.0.exe       (~500 MB) [if NSIS enabled]
```

## Verification

### Quick Test (Before Distribution)

```powershell
# Navigate to build output
cd dist\electron\win-unpacked

# Run the application
."ARUS Marine Monitoring.exe"
```

**Expected behavior:**
1. App window opens
2. Dashboard loads at `http://localhost:5000`
3. No console errors related to modules
4. Serial port detection works (if hardware connected)
5. SQLite database created in AppData directory

### Verify Native Modules

```powershell
# Check that native modules are compiled for Windows
cd "win-unpacked\resources\app\node_modules\serialport\build\Release"

# Check file type
file bindings.node
# Expected: PE32+ executable (DLL) (console) x86-64
```

## Distribution

### Option 1: Portable Application (Recommended)
Package the entire `win-unpacked` folder as a ZIP:

```powershell
# Create distribution ZIP
Compress-Archive -Path "dist\electron\win-unpacked" -DestinationPath "ARUS-Windows-1.0.0.zip"
```

**Installation for end users:**
1. Extract ZIP file
2. Run `ARUS Marine Monitoring.exe`
3. (Optional) Create desktop shortcut

### Option 2: NSIS Installer
If electron-builder created an `.exe` installer:

```
ARUS Marine Monitoring Setup 1.0.0.exe
```

**Installation:**
1. Run installer
2. Follow installation wizard
3. Launch from Start Menu or Desktop shortcut

## Troubleshooting

### Issue: "Windows protected your PC" warning

**Solution:**
1. Click "More info"
2. Click "Run anyway"

**Permanent fix:** Code-sign the executable (requires certificate)

### Issue: Native module compilation fails during npm install

**Symptoms:**
```
error MSB4019: The imported project "C:\Microsoft.Cpp.Default.props" was not found.
```

**Solution:** Install Visual Studio Build Tools (see Prerequisites)

### Issue: Python not found during build

**Symptoms:**
```
gyp ERR! find Python
```

**Solution:**
```powershell
# Set Python path explicitly
npm config set python "C:\Python311\python.exe"
```

### Issue: "node.exe not found" when running app

**Symptoms:**
```
Error: spawn node.exe ENOENT
```

**Solution:** Ensure build completed successfully and `nodejs-windows` folder exists in the package.

### Issue: Antivirus blocking the application

**Symptoms:** App deleted or quarantined after building

**Solution:**
1. Add build directory to antivirus exclusions
2. Disable real-time protection during build
3. Code-sign the executable for distribution

### Issue: Module version mismatch

**Symptoms:**
```
Error: The module '\\?\C:\...\bindings.node'
was compiled against a different Node.js version
```

**Solution:**
```powershell
# Rebuild native modules for current Node.js version
npm rebuild
```

## Build Artifacts

After successful build:

```
dist\
├── electron\
│   ├── win-unpacked\
│   │   ├── ARUS Marine Monitoring.exe   # Main executable
│   │   ├── resources\
│   │   │   ├── app\
│   │   │   │   ├── package.json
│   │   │   │   ├── dist\index.js
│   │   │   │   └── node_modules\
│   │   │   └── nodejs\
│   │   │       └── node.exe
│   │   └── [DLLs and supporting files]
│   └── builder-effective-config.yaml
└── installers\
    └── ARUS-Marine-Monitoring-1.0.0-windows.tar.gz
```

## Technical Details

### What Gets Packaged

```
win-unpacked\
├── ARUS Marine Monitoring.exe          # Electron executable
├── resources\
│   ├── app\
│   │   ├── package.json                # ES module marker
│   │   ├── dist\
│   │   │   └── index.js                # Backend server
│   │   └── node_modules\               # Production deps (Windows-native)
│   ├── nodejs\
│   │   └── node.exe                    # Bundled Node.js v20.11
│   └── app.asar                        # Electron app code
├── ffmpeg.dll
├── libEGL.dll
├── libGLESv2.dll
└── [Other Electron DLLs]
```

### Native Modules Included

- `@libsql/client` - SQLite operations
- `@tensorflow/tfjs-node` - ML predictions  
- `serialport` - Marine communications
- `better-sqlite3` - Database
- Native bindings for Windows x64

### Size Breakdown

- Electron Framework: ~200 MB
- Node.js Runtime: ~85 MB
- Application Code: ~50 MB
- node_modules: ~1.5 GB (includes TensorFlow)
- **Total: ~2-3 GB uncompressed**

## Code Signing (Optional)

For production distribution, sign the executable:

### Get a Code Signing Certificate

1. Purchase from: DigiCert, Sectigo, GlobalSign, etc.
2. Or use self-signed certificate (for testing only)

### Sign the Application

```powershell
# Using signtool (included with Windows SDK)
signtool sign /f "certificate.pfx" /p "password" /t "http://timestamp.digicert.com" "ARUS Marine Monitoring.exe"
```

### Verify Signature

```powershell
signtool verify /pa "ARUS Marine Monitoring.exe"
```

## Performance Optimization

### Reduce Package Size

1. **Remove dev dependencies before packaging:**
```powershell
npm prune --production
```

2. **Exclude TensorFlow if not needed:**
Modify `electron-builder.yml`:
```yaml
files:
  - "!node_modules/@tensorflow/**"
```

## Deployment to Vessels

### Offline Installation (Recommended)

1. Copy `ARUS-Windows-1.0.0.zip` to USB drive
2. Transfer to vessel computer
3. Extract and run

### Network Installation

1. Host installer on internal network
2. Download and install from network share

### First Run Configuration

The app creates configuration in:
```
%APPDATA%\ARUS Marine Monitoring\
├── config.json
├── database.db (SQLite)
└── logs\
```

## Support

For build issues:
1. Check this guide's Troubleshooting section
2. Verify all prerequisites are installed
3. Check build logs in PowerShell output
4. Ensure you're building on Windows (not Linux/macOS)

## Build Script Reference

If the bash script doesn't work on Windows, create this PowerShell script:

**build-windows.ps1:**
```powershell
# Build ARUS for Windows
Write-Host "Building ARUS for Windows..." -ForegroundColor Green

# Step 1: Build application
Write-Host "`nStep 1: Building application..." -ForegroundColor Yellow
npm run build

# Step 2: Build Electron app
Write-Host "`nStep 2: Building desktop application..." -ForegroundColor Yellow
npx electron-builder --win --dir

# Step 3: Package
Write-Host "`nStep 3: Creating distribution package..." -ForegroundColor Yellow
Compress-Archive -Path "dist\electron\win-unpacked" -DestinationPath "dist\installers\ARUS-Windows-1.0.0.zip" -Force

Write-Host "`nBuild complete!" -ForegroundColor Green
Write-Host "Package: dist\installers\ARUS-Windows-1.0.0.zip" -ForegroundColor Cyan
```

Run with:
```powershell
.\build-windows.ps1
```

---

**Last Updated:** 2025-10-20
**Supported Windows Versions:** Windows 10 (64-bit), Windows 11
**Node.js Version:** 20.11.0
**Electron Version:** 33.4.11
