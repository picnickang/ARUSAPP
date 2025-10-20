#!/bin/bash
# ARUS macOS Desktop Build - Final Version

set -e

echo "🍎 ARUS macOS Desktop Builder"
echo "=============================="
echo ""

# Check if build exists
if [ ! -f "dist/index.js" ]; then
    echo "Building application first..."
    npm run build
fi

# Download Node.js runtime if not present
if [ ! -d "electron/nodejs" ]; then
    echo "Downloading Node.js runtime..."
    ./scripts/download-node-binary.sh
else
    echo "✓ Node.js runtime found ($(du -sh electron/nodejs | cut -f1))"
fi

# Verify Node.js binary exists
if [ ! -f "electron/nodejs/bin/node" ]; then
    echo "❌ ERROR: Node.js binary not found at electron/nodejs/bin/node"
    exit 1
fi

echo "✓ Node.js binary verified"
echo ""

# Clean previous build artifacts
echo "Cleaning previous builds..."
rm -rf dist/installers
mkdir -p dist/installers

echo "Building macOS app (this takes 3-5 minutes)..."
echo ""

# Set environment variable to skip binary downloads and use prebuilt native modules
export ELECTRON_SKIP_BINARY_DOWNLOAD=1

# Build for macOS
npx electron-builder --mac tar.gz --config electron-builder.yml

echo ""
echo "✅ Build Complete!"
echo "=================="
echo ""

# Show what was created
if ls dist/*.tar.gz 1> /dev/null 2>&1; then
    echo "Installer created:"
    ls -lh dist/*.tar.gz
    
    # Move to installers directory
    mv dist/*.tar.gz dist/installers/ 2>/dev/null || true
    
    echo ""
    echo "📦 Final installer:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
fi

echo ""
echo "To install:"
echo "  1. cd dist/installers"
echo "  2. tar -xzf ARUS-Marine-Monitoring-1.0.0-mac.tar.gz"
echo "  3. cp -r 'ARUS Marine Monitoring.app' /Applications/"
echo "  4. open '/Applications/ARUS Marine Monitoring.app'"
echo ""
echo "Note: If macOS blocks it, right-click → Open"
echo ""
