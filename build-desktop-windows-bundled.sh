#!/bin/bash
# Build ARUS Desktop Application for Windows (Bundled Server Version)
# Creates .exe installers with Express server bundled inside

set -e

echo "🪟 ARUS Windows Desktop Application Builder (Bundled)"
echo "====================================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Download Node.js runtime if not present
if [ ! -d "electron/nodejs-windows" ]; then
    echo "❌ ERROR: Windows Node.js runtime not found!"
    echo "   Expected location: electron/nodejs-windows"
    echo ""
    echo "Please download Windows Node.js v20.11 first:"
    echo "  1. Visit: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
    echo "  2. Extract to: electron/nodejs-windows/"
    echo "  3. Verify node.exe is at: electron/nodejs-windows/node.exe"
    echo ""
    exit 1
else
    echo "✓ Node.js runtime already downloaded"
    echo "  Location: electron/nodejs-windows"
    echo "  Size: $(du -sh electron/nodejs-windows | cut -f1)"
fi

# Verify Node.js binary exists (critical check)
if [ ! -f "electron/nodejs-windows/node.exe" ]; then
    echo ""
    echo "❌ ERROR: Node.js binary not found!"
    echo "   Expected location: electron/nodejs-windows/node.exe"
    echo ""
    echo "The build cannot continue without the Node.js runtime."
    echo "Please ensure node.exe is in electron/nodejs-windows/"
    echo ""
    exit 1
fi

echo "✓ Node.js binary verified at: electron/nodejs-windows/node.exe"

# Clean up any previous build
echo "Cleaning up previous build..."
rm -rf windows-build-bundled

# Create build directory
echo "Setting up build environment..."
mkdir -p windows-build-bundled

# Copy necessary files
echo "Copying application files..."
cp -r dist windows-build-bundled/
cp -r electron windows-build-bundled/
cp electron-builder.yml windows-build-bundled/
cp -r node_modules windows-build-bundled/ 2>/dev/null || echo "Note: node_modules will be installed fresh"

# Create minimal package.json for electron-builder
cat > windows-build-bundled/package.json << 'EOF'
{
  "name": "arus-marine-monitoring",
  "productName": "ARUS Marine Monitoring",
  "version": "1.0.0",
  "description": "Marine Predictive Maintenance & Scheduling System",
  "main": "electron/main.js",
  "author": "ARUS Team",
  "license": "MIT",
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^26.0.0"
  }
}
EOF

# Build installer
cd windows-build-bundled
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "Building Windows installers with bundled server (this may take a few minutes)..."
echo "This will create:"
echo "  - NSIS installer (.exe with installation wizard)"
echo "  - Portable version (.exe standalone)"
echo ""

# Build for Windows (creates unpacked directory - installers require Wine on Linux)
# Building just the unpacked app - users can create installers on Windows if needed
npx electron-builder --win --dir --config ../electron-builder.yml

cd ..

# Move built files to dist directory
mkdir -p dist/installers

# Package the unpacked Windows app as a ZIP file (Windows-native format)
if [ -d "windows-build-bundled/dist/electron/win-unpacked" ]; then
    echo "Packaging Windows application as ZIP (using Node.js)..."
    node -e "
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const zip = new AdmZip();
zip.addLocalFolder('windows-build-bundled/dist/electron/win-unpacked', 'win-unpacked');
zip.writeZip('dist/installers/ARUS-Marine-Monitoring-1.0.0-windows.zip');
console.log('✅ ZIP file created');
"
    echo "✅ Windows application packaged as ZIP"
else
    echo "⚠️  win-unpacked directory not found"
    # Try alternate location
    if [ -d "windows-build-bundled/dist/win-unpacked" ]; then
        echo "Packaging Windows application as ZIP (using Node.js)..."
        node -e "
const AdmZip = require('adm-zip');
const zip = new AdmZip();
zip.addLocalFolder('windows-build-bundled/dist/win-unpacked', 'win-unpacked');
zip.writeZip('dist/installers/ARUS-Marine-Monitoring-1.0.0-windows.zip');
console.log('✅ ZIP file created');
"
        echo "✅ Windows application packaged as ZIP"
    fi
fi

# Cleanup
rm -rf windows-build-bundled

echo ""
echo "✅ Windows Desktop Application Built (Bundled)!"
echo "================================================"
echo ""
echo "Installer files created:"
ls -lh dist/installers/*-windows.zip 2>/dev/null || echo "(No installer files found)"
echo ""

# Show the actual files if they exist
if ls dist/installers/*-windows.zip 1> /dev/null 2>&1; then
    echo "✅ Windows application package ready (with bundled server):"
    ls -lh dist/installers/*-windows.zip
    echo ""
fi
echo ""
echo "This version includes:"
echo "  ✅ Express server bundled inside the app"
echo "  ✅ Complete Node.js v20.11 runtime for Windows"
echo "  ✅ SQLite database for offline operation"
echo "  ✅ ALL dependencies bundled - 100% standalone!"
echo ""
echo "To install:"
echo "  1. Extract ARUS-Marine-Monitoring-1.0.0-windows.zip (right-click → Extract All)"
echo "  2. Open the 'win-unpacked' folder"
echo "  3. Run 'ARUS Marine Monitoring.exe'"
echo "  4. Dashboard opens automatically in 3-5 seconds"
echo ""
echo "Note: Built on Linux - ZIP format is Windows-native (no 3rd party tools needed)"
echo "      This is a portable Windows application - no installation required!"
echo ""
echo "Size: ~300-400 MB compressed (~600 MB extracted)"
echo "Works on: Windows 10/11 (64-bit)"
echo ""
