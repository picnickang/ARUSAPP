#!/bin/bash
# Complete fix and build for ARUS macOS Desktop App
# This script fixes all issues and builds a working installer

set -e

echo "🔧 ARUS Desktop Build - Complete Fix & Build"
echo "=============================================="
echo ""

# Step 1: Fix package.json to pin exact electron version
echo "Step 1: Fixing package.json..."
python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

# Ensure electron is in devDependencies with EXACT version (no ^)
if 'devDependencies' not in data:
    data['devDependencies'] = {}

# Pin to exact version
data['devDependencies']['electron'] = '38.3.0'
data['devDependencies']['electron-builder'] = '26.0.12'

# Remove from dependencies if present
if 'dependencies' in data:
    data['dependencies'].pop('electron', None)
    data['dependencies'].pop('electron-builder', None)

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('✅ package.json fixed - electron pinned to 38.3.0')
EOF

echo ""

# Step 2: Clean install to get electron binary
echo "Step 2: Installing dependencies (including electron binary)..."
npm install

echo ""

# Step 3: Rebuild native modules against Electron
echo "Step 3: Rebuilding native modules for Electron..."
npx electron-builder install-app-deps --platform=darwin --arch=x64

echo ""

# Step 4: Verify Node.js runtime
if [ ! -d "electron/nodejs" ]; then
    echo "Step 4: Downloading Node.js runtime..."
    ./scripts/download-node-binary.sh
else
    echo "Step 4: ✓ Node.js runtime found ($(du -sh electron/nodejs | cut -f1))"
fi

if [ ! -f "electron/nodejs/bin/node" ]; then
    echo "❌ ERROR: Node.js binary not found"
    exit 1
fi

echo "✓ Node.js binary verified"
echo ""

# Step 5: Build application
if [ ! -f "dist/index.js" ]; then
    echo "Step 5: Building application..."
    npm run build
else
    echo "Step 5: ✓ Application already built"
fi

echo ""

# Step 6: Clean and build macOS installer
echo "Step 6: Building macOS desktop installer..."
rm -rf dist/installers dist/electron
mkdir -p dist/installers

npx electron-builder --mac tar.gz --config electron-builder.yml

echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="
echo ""

# Show results
if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/ 2>/dev/null || true
fi

if ls dist/installers/*.tar.gz 1> /dev/null 2>&1; then
    echo "📦 Installer created:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "To install:"
    echo "  1. cd dist/installers"
    echo "  2. tar -xzf ARUS-Marine-Monitoring-1.0.0-mac.tar.gz"
    echo "  3. cp -r 'ARUS Marine Monitoring.app' /Applications/"
    echo "  4. open '/Applications/ARUS Marine Monitoring.app'"
    echo ""
    echo "Note: First launch - right-click → Open to bypass Gatekeeper"
else
    echo "⚠️  No installer found - check output above for errors"
fi

echo ""
