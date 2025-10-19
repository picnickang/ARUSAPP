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
echo "  ✅ SQLite database support"
echo "  ✅ No external dependencies needed"
echo "  ✅ Runs completely standalone"
echo ""
echo "To install:"
echo "  1. Open the .dmg file"
echo "  2. Drag ARUS to Applications folder"
echo "  3. Launch from Applications - it will just work!"
echo ""
