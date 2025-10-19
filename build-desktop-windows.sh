#!/bin/bash
# Build ARUS Desktop Application for Windows
# Creates .exe installer for Windows

set -e

echo "🪟 ARUS Windows Desktop Application Builder"
echo "============================================"
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Create build directory
echo "Setting up build environment..."
mkdir -p windows-build-temp

# Copy necessary files
cp -r dist windows-build-temp/
cp -r electron windows-build-temp/
cp electron-builder.yml windows-build-temp/

# Create proper package.json for electron-builder
cat > windows-build-temp/package.json << 'EOF'
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
cd windows-build-temp
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "Building Windows installer (this may take a few minutes)..."
echo ""

# Build for Windows (creates both NSIS installer and portable)
npx electron-builder --win

cd ..

# Move built files to dist directory
mkdir -p dist/installers
if [ -d "windows-build-temp/dist" ]; then
    cp -r windows-build-temp/dist/* dist/installers/ 2>/dev/null || true
fi

# Cleanup
rm -rf windows-build-temp

echo ""
echo "✅ Windows Desktop Application Built!"
echo "======================================"
echo ""
echo "Installers created:"
ls -lh dist/installers/*.exe 2>/dev/null || echo "EXE files not found"
echo ""
echo "You should have:"
echo "  - ARUS-Setup-1.0.0.exe  (Installer version)"
echo "  - ARUS-1.0.0.exe        (Portable version)"
echo ""
echo "To install:"
echo "  1. Run ARUS-Setup-1.0.0.exe"
echo "  2. Follow the installation wizard"
echo "  3. Launch from Start Menu"
echo ""
echo "For portable (no installation):"
echo "  - Just run ARUS-1.0.0.exe directly"
echo ""
