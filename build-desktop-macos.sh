#!/bin/bash
# Build ARUS Desktop Application for macOS
# Creates .dmg installer for Mac

set -e

echo "🍎 ARUS macOS Desktop Application Builder"
echo "==========================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Create build directory
echo "Setting up build environment..."
mkdir -p macos-build-temp

# Copy necessary files
cp -r dist macos-build-temp/
cp -r electron macos-build-temp/
cp electron-builder.yml macos-build-temp/

# Create proper package.json for electron-builder
cat > macos-build-temp/package.json << 'EOF'
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
cd macos-build-temp
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "Building macOS installer (this may take a few minutes)..."
echo ""

# Build for macOS
npx electron-builder --mac dmg

cd ..

# Move built files to dist directory
mkdir -p dist/installers
if [ -d "macos-build-temp/dist" ]; then
    cp -r macos-build-temp/dist/* dist/installers/ 2>/dev/null || true
fi

# Cleanup
rm -rf macos-build-temp

echo ""
echo "✅ macOS Desktop Application Built!"
echo "===================================="
echo ""
echo "Installer created:"
ls -lh dist/installers/*.dmg 2>/dev/null || echo "DMG file not found"
echo ""
echo "To install:"
echo "  1. Open the .dmg file"
echo "  2. Drag ARUS to Applications folder"
echo "  3. Launch from Applications"
echo ""
