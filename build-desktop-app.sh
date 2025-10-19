#!/bin/bash
# Build ARUS Desktop Application Installers
# This script creates Windows .exe, macOS .dmg, and Linux .AppImage

set -e

echo "📦 ARUS Desktop Application Builder"
echo "====================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Create basic package structure for Electron
echo "Setting up Electron package..."
mkdir -p electron-build-temp

# Copy necessary files
cp -r dist electron-build-temp/
cp -r electron electron-build-temp/
cp electron-builder.yml electron-build-temp/
cp package.json electron-build-temp/package-orig.json

# Create minimal package.json for electron-builder
cat > electron-build-temp/package.json << 'EOF'
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

# Build installers
cd electron-build-temp
echo ""
echo "Building installers (this may take a few minutes)..."
echo ""

# Install electron locally for building
npm install

# Build for current platform
npx electron-builder --linux AppImage --config ../electron-builder.yml

cd ..

# Move built files to main dist directory
mkdir -p dist/installers
if [ -d "electron-build-temp/dist" ]; then
    cp -r electron-build-temp/dist/* dist/installers/ 2>/dev/null || true
fi

# Cleanup
rm -rf electron-build-temp

echo ""
echo "✅ Desktop Application Built!"
echo "=============================="
echo ""
echo "Installers created in: dist/installers/"
ls -lh dist/installers/ 2>/dev/null || echo "No files in dist/installers yet"
echo ""
echo "Note: Building for Windows (.exe) and macOS (.dmg) requires"
echo "running on those respective platforms or using a CI service."
echo ""
echo "Current platform build completed successfully!"
