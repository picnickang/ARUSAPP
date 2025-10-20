# Building ARUS for macOS

This guide explains how to build the ARUS Marine Monitoring desktop application **on a macOS machine**.

## ⚠️ CRITICAL: Why Build on macOS?

The application uses native Node.js modules that must be compiled for the target platform:
- `serialport` - Marine protocol communications (J1939, J1708, J1587)
- `@libsql/client` - SQLite database for vessel deployments
- `@tensorflow/tfjs-node` - Machine learning predictions
- `better-sqlite3` - Database operations

**Building on Linux produces Linux binaries that will crash on macOS.**

## Prerequisites

### 1. Hardware Requirements
- **macOS 10.13 (High Sierra) or later**
- **8 GB RAM minimum** (16 GB recommended)
- **10 GB free disk space**
- Apple Silicon (M1/M2/M3) or Intel processor

### 2. Software Requirements

Install the following tools:

#### a) Xcode Command Line Tools
```bash
xcode-select --install
```

#### b) Node.js v20.x
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

#### c) Git
```bash
# Already included with Xcode Command Line Tools
git --version
```

## Build Process

### Step 1: Clone or Download Repository

```bash
# If using git
git clone <your-repository-url>
cd <repository-name>

# Or extract from archive
unzip arus-source.zip
cd arus
```

### Step 2: Install Dependencies

```bash
# Install ALL dependencies (including devDependencies for building)
npm install

# This will compile native modules for macOS
```

**Expected duration:** 5-10 minutes

### Step 3: Build the Application

```bash
# Build frontend and backend
npm run build
```

**Expected output:**
- `dist/public/` - Frontend assets
- `dist/index.js` - Backend server (2-3 MB)

### Step 4: Build macOS Desktop Application

```bash
# Run the macOS-specific build script
chmod +x build-desktop-macos-bundled.sh
./build-desktop-macos-bundled.sh
```

**This script will:**
1. Download Node.js v20.11 runtime for macOS (if not already present)
2. Create a clean build environment
3. Install production dependencies (with macOS-native modules)
4. Package the application with electron-builder
5. Create distributable archives

**Expected duration:** 10-15 minutes

**Expected output:**
```
dist/installers/
├── ARUS-Marine-Monitoring-1.0.0-mac.tar.gz  (~500-800 MB)
└── ARUS Marine Monitoring-1.0.0.dmg         (~500-800 MB)
```

## Verification

### Quick Test (Before Distribution)

```bash
# Extract and test the app
cd dist/installers
tar -xzf ARUS-Marine-Monitoring-1.0.0-mac.tar.gz
open "mac/ARUS Marine Monitoring.app"
```

**Expected behavior:**
1. App icon appears in Dock
2. Dashboard opens in browser at `http://localhost:5000`
3. No console errors related to modules
4. Serial port detection works (if hardware connected)
5. SQLite database created in app data directory

### Verify Native Modules

```bash
# Check that native modules are compiled for macOS
cd "mac/ARUS Marine Monitoring.app/Contents/Resources/app/node_modules"

# serialport (ARM64 for Apple Silicon, x64 for Intel)
file serialport/build/Release/bindings.node

# Expected output (Apple Silicon):
# serialport/build/Release/bindings.node: Mach-O 64-bit bundle arm64

# Expected output (Intel):
# serialport/build/Release/bindings.node: Mach-O 64-bit bundle x86_64
```

## Distribution

### Option 1: DMG Installer (Recommended)
Use the `.dmg` file for end users:
```
ARUS Marine Monitoring-1.0.0.dmg
```

**Installation:**
1. Double-click the DMG
2. Drag app to Applications folder
3. Launch from Applications

### Option 2: Archive
Use the `.tar.gz` for manual installation:
```
ARUS-Marine-Monitoring-1.0.0-mac.tar.gz
```

**Installation:**
1. Extract archive
2. Copy `ARUS Marine Monitoring.app` to Applications
3. Launch from Applications

## Troubleshooting

### Issue: "App can't be opened because it is from an unidentified developer"

**Solution:**
```bash
# Remove quarantine attribute
xattr -rd com.apple.quarantine "/Applications/ARUS Marine Monitoring.app"
```

Or: System Preferences → Security & Privacy → Click "Open Anyway"

### Issue: Native module errors on Apple Silicon

**Symptoms:**
```
Error: Module did not self-register
```

**Cause:** Built on Intel Mac, running on Apple Silicon (or vice versa)

**Solution:** Build on the same architecture as deployment target, or build universal binaries:
```bash
# Modify electron-builder.yml:
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
```

### Issue: Node.js runtime not found

**Symptoms:**
```
Error: spawn node ENOENT
```

**Solution:** Ensure build completed successfully and `electron/nodejs` was downloaded.

### Issue: Permission denied when launching

**Solution:**
```bash
chmod +x "/Applications/ARUS Marine Monitoring.app/Contents/MacOS/ARUS Marine Monitoring"
```

## Build Artifacts

After successful build:

```
dist/
├── electron/
│   ├── mac/
│   │   └── ARUS Marine Monitoring.app   # Standalone app
│   └── builder-effective-config.yaml
└── installers/
    ├── ARUS-Marine-Monitoring-1.0.0-mac.tar.gz
    └── ARUS Marine Monitoring-1.0.0.dmg
```

**Final deliverables:**
- **For end users:** `ARUS Marine Monitoring-1.0.0.dmg` (recommended)
- **For manual deployment:** `ARUS-Marine-Monitoring-1.0.0-mac.tar.gz`

## Technical Details

### What Gets Packaged

```
ARUS Marine Monitoring.app/
├── Contents/
│   ├── MacOS/
│   │   └── ARUS Marine Monitoring      # Electron executable
│   ├── Resources/
│   │   ├── app/
│   │   │   ├── package.json            # ES module marker
│   │   │   ├── dist/
│   │   │   │   └── index.js            # Backend server
│   │   │   └── node_modules/           # Production dependencies (macOS-native)
│   │   ├── nodejs/
│   │   │   └── bin/node                # Bundled Node.js v20.11
│   │   └── app.asar                    # Electron app code
│   └── Info.plist
```

### Native Modules Included

- `@libsql/client` - SQLite operations
- `@tensorflow/tfjs-node` - ML predictions
- `serialport` - Marine communications
- `better-sqlite3` - Database
- Native bindings for macOS (arm64 or x64)

### Size Breakdown

- Electron Framework: ~180 MB
- Node.js Runtime: ~80 MB
- Application Code: ~50 MB
- node_modules: ~200 MB
- **Total: ~500-800 MB**

## Security Notes

### Code Signing (Optional)

For production distribution, sign the app:

```bash
# Requires Apple Developer account
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" "ARUS Marine Monitoring.app"
```

### Notarization (Optional)

For macOS 10.15+, notarize the app:

```bash
# Submit for notarization
xcrun notarytool submit "ARUS Marine Monitoring.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait
```

## Support

For build issues:
1. Check this guide's Troubleshooting section
2. Verify all prerequisites are installed
3. Check build logs in terminal output
4. Ensure you're building on macOS (not Linux/Windows)

---

**Last Updated:** 2025-10-20
**Supported macOS Versions:** 10.13 (High Sierra) and later
**Node.js Version:** 20.11.0
**Electron Version:** 33.4.11
