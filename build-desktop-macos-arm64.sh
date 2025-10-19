#!/bin/bash
# Build ARUS Desktop Application for macOS Apple Silicon (ARM64)
# Creates .dmg installer with Express server bundled inside

set -e

echo "🍎 ARUS macOS Desktop Application Builder (Apple Silicon ARM64)"
echo "==============================================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Download Node.js ARM64 runtime if not present
if [ ! -d "electron/nodejs-arm64" ]; then
    echo "Downloading Node.js ARM64 runtime..."
    ./scripts/download-node-arm64.sh
else
    echo "✓ Node.js ARM64 runtime already downloaded"
    echo "  Location: electron/nodejs-arm64"
    echo "  Size: $(du -sh electron/nodejs-arm64 | cut -f1)"
fi

# Clean up any previous build
echo "Cleaning up previous build..."
rm -rf macos-build-arm64

# Create build directory
echo "Setting up build environment..."
mkdir -p macos-build-arm64

# Copy necessary files
echo "Copying application files..."
cp -r dist macos-build-arm64/
cp -r electron macos-build-arm64/

# Remove Intel Node.js runtime if it exists
if [ -d "macos-build-arm64/electron/nodejs" ]; then
    rm -rf macos-build-arm64/electron/nodejs
    echo "✓ Removed Intel Node.js runtime"
fi

# Rename ARM64 Node.js runtime to nodejs for packaging
if [ -d "macos-build-arm64/electron/nodejs-arm64" ]; then
    mv macos-build-arm64/electron/nodejs-arm64 macos-build-arm64/electron/nodejs
    echo "✓ Installed ARM64 Node.js runtime"
else
    echo "❌ ERROR: ARM64 Node.js runtime not found!"
    echo "Run: ./scripts/download-node-arm64.sh"
    exit 1
fi

# Verify it's ARM64
if [ -f "macos-build-arm64/electron/nodejs/bin/node" ]; then
    echo "✓ Verifying Node.js architecture..."
    if file macos-build-arm64/electron/nodejs/bin/node | grep -q "arm64"; then
        echo "✅ Confirmed ARM64 binary"
    else
        echo "❌ ERROR: Node.js binary is NOT ARM64!"
        echo "Expected: Mach-O 64-bit executable arm64"
        echo "Got:"
        file macos-build-arm64/electron/nodejs/bin/node
        exit 1
    fi
else
    echo "❌ ERROR: Node.js binary not found at expected location!"
    exit 1
fi

# Create electron-builder config for ARM64
cat > macos-build-arm64/electron-builder.yml << 'EOF'
appId: com.arus.marine.monitoring
productName: ARUS Marine Monitoring
copyright: Copyright © 2025 ARUS

directories:
  buildResources: electron/build
  output: dist/electron

files:
  - electron/**/*
  - package.json
  - "!node_modules/@tensorflow"
  - "!node_modules/electron"
  - "!node_modules/electron-builder"
  
extraResources:
  - from: "dist"
    to: "app/dist"
    filter:
      - "**/*"
      - "!electron/**"
  - from: "electron/nodejs"
    to: "nodejs"
    filter:
      - "**/*"

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: arm64
    - target: zip
      arch: arm64
  hardenedRuntime: false
  gatekeeperAssess: false
  
dmg:
  title: "${productName} ${version}"
  window:
    width: 600
    height: 400

compression: maximum
asar: true
asarUnpack:
  - node_modules/better-sqlite3/**/*
  - node_modules/@libsql/**/*
EOF

# Create minimal package.json for electron-builder
cat > macos-build-arm64/package.json << 'EOF'
{
  "name": "arus-marine-monitoring",
  "productName": "ARUS Marine Monitoring",
  "version": "1.0.0",
  "description": "Marine Predictive Maintenance & Scheduling System (Apple Silicon)",
  "main": "electron/main.js",
  "author": "ARUS Team",
  "license": "MIT",
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^26.0.0",
    "dmg-license": "^1.0.11"
  }
}
EOF

# Build installer
cd macos-build-arm64
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "Building macOS ARM64 installer (this may take a few minutes)..."
echo ""

# Build for macOS ARM64
npx electron-builder --mac dmg --arm64 --config electron-builder.yml

cd ..

# Move built files to dist directory
mkdir -p dist/installers

# Find and copy all DMG and ZIP files
if [ -d "macos-build-arm64/dist" ]; then
    find macos-build-arm64/dist -name "*.dmg" -exec cp {} dist/installers/ \; 2>/dev/null || true
    find macos-build-arm64/dist -name "*.zip" -exec cp {} dist/installers/ \; 2>/dev/null || true
    
    # Rename to indicate ARM64
    for file in dist/installers/ARUS*.dmg; do
        if [ -f "$file" ]; then
            newname="${file%.dmg}-arm64.dmg"
            mv "$file" "$newname"
        fi
    done
    
    for file in dist/installers/ARUS*.zip; do
        if [ -f "$file" ]; then
            newname="${file%.zip}-arm64.zip"
            mv "$file" "$newname"
        fi
    done
fi

# Cleanup
rm -rf macos-build-arm64

echo ""
echo "✅ macOS Apple Silicon Desktop Application Built!"
echo "================================================="
echo ""
echo "Installer files created:"
ls -lh dist/installers/*-arm64.dmg 2>/dev/null || echo "(No ARM64 DMG files)"
ls -lh dist/installers/*-arm64.zip 2>/dev/null || echo "(No ARM64 ZIP files)"
echo ""

if ls dist/installers/*-arm64.dmg 1> /dev/null 2>&1; then
    echo "✅ ARM64 DMG installer ready:"
    ls -lh dist/installers/*-arm64.dmg
fi
echo ""
echo "This version includes:"
echo "  ✅ Express server bundled inside the app"
echo "  ✅ Native Node.js v20.11 runtime for Apple Silicon"
echo "  ✅ SQLite database for offline operation"
echo "  ✅ ALL dependencies bundled - 100% standalone!"
echo "  ✅ NATIVE performance on M1/M2/M3 Macs!"
echo ""
echo "To install:"
echo "  1. Open the .dmg file"
echo "  2. Drag ARUS to Applications folder"
echo "  3. Right-click → Open (first time only, bypasses Gatekeeper)"
echo "  4. Dashboard opens automatically in 2-4 seconds!"
echo ""
echo "Size: ~180-200 MB (complete runtime included)"
echo "Works on: macOS 11+ (Apple Silicon M1/M2/M3)"
echo "Performance: NATIVE - No Rosetta 2 needed!"
echo ""
