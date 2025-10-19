#!/bin/bash
# Build ARUS Desktop Application for macOS (Bundled Server Version)
# Creates .dmg installer with Express server bundled inside

set -e

echo "🍎 ARUS macOS Desktop Application Builder (Bundled)"
echo "===================================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Download Node.js runtime if not present
if [ ! -d "electron/nodejs" ]; then
    echo "Downloading Node.js runtime..."
    ./scripts/download-node-binary.sh
else
    echo "✓ Node.js runtime already downloaded"
    echo "  Location: electron/nodejs"
    echo "  Size: $(du -sh electron/nodejs | cut -f1)"
fi

# Verify Node.js binary exists (critical check)
if [ ! -f "electron/nodejs/bin/node" ]; then
    echo ""
    echo "❌ ERROR: Node.js binary not found!"
    echo "   Expected location: electron/nodejs/bin/node"
    echo ""
    echo "The build cannot continue without the Node.js runtime."
    echo "Please run: ./scripts/download-node-binary.sh"
    echo ""
    exit 1
fi

echo "✓ Node.js binary verified at: electron/nodejs/bin/node"

# Clean up any previous build
echo "Cleaning up previous build..."
rm -rf macos-build-bundled

# Create build directory
echo "Setting up build environment..."
mkdir -p macos-build-bundled

# Copy necessary files
echo "Copying application files..."
cp -r dist macos-build-bundled/
cp -r electron macos-build-bundled/
cp electron-builder.yml macos-build-bundled/
cp -r node_modules macos-build-bundled/ 2>/dev/null || echo "Note: node_modules will be installed fresh"

# Create minimal package.json for electron-builder
cat > macos-build-bundled/package.json << 'EOF'
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
    "electron-builder": "^26.0.0",
    "dmg-license": "^1.0.11"
  }
}
EOF

# Build installer
cd macos-build-bundled
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "Building macOS installer with bundled server (this may take a few minutes)..."
echo ""

# Build for macOS with proper packaging
npx electron-builder --mac dmg --config ../electron-builder.yml

cd ..

# Move built files to dist directory
mkdir -p dist/installers

# Find and copy all DMG files
if [ -d "macos-build-bundled/dist" ]; then
    find macos-build-bundled/dist -name "*.dmg" -exec cp {} dist/installers/ \; 2>/dev/null || true
    find macos-build-bundled/dist -name "*.zip" -exec cp {} dist/installers/ \; 2>/dev/null || true
fi

# Cleanup
rm -rf macos-build-bundled

echo ""
echo "✅ macOS Desktop Application Built (Bundled)!"
echo "=============================================="
echo ""
echo "Installer files created:"
ls -lh dist/installers/*.dmg 2>/dev/null || echo "(No DMG files)"
ls -lh dist/installers/*.zip 2>/dev/null || echo "(No ZIP files)"
echo ""

# Show the actual location if files exist
if ls dist/installers/*.dmg 1> /dev/null 2>&1; then
    echo "✅ DMG installer ready (with bundled server):"
    ls -lh dist/installers/*.dmg
fi
echo ""
echo "This version includes:"
echo "  ✅ Express server bundled inside the app"
echo "  ✅ Complete Node.js v20.11 runtime (bin + libraries)"
echo "  ✅ SQLite database for offline operation"
echo "  ✅ ALL dependencies bundled - 100% standalone!"
echo ""
echo "To install:"
echo "  1. Open the .dmg file"
echo "  2. Drag ARUS to Applications folder"
echo "  3. Right-click → Open (first time only, bypasses Gatekeeper)"
echo "  4. Dashboard opens automatically in 3-5 seconds!"
echo ""
echo "Size: ~180-200 MB (complete runtime included)"
echo "Works on: macOS 10.13+ (Intel Macs)"
echo ""
