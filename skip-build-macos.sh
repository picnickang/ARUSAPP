#!/bin/bash
# macOS build - assumes server is already built on Replit

set -e

echo "🎯 ARUS macOS Build - Pre-built Server"
echo "======================================="
echo ""

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERROR: dist/index.js not found"
    echo ""
    echo "You need to build the server on Replit first:"
    echo "  1. In Replit, run: npm run build"
    echo "  2. Download the project again (will include dist/index.js)"
    echo "  3. Run this script on your Mac"
    exit 1
fi

echo "✅ Found pre-built server: dist/index.js"
ls -lh dist/index.js

# Step 1: Fix package.json
echo ""
echo "Step 1: Fixing package.json..."
python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

data['main'] = 'electron/main.js'
data['description'] = 'Marine Predictive Maintenance & Scheduling System'
data['author'] = 'ARUS Team'

if 'devDependencies' not in data:
    data['devDependencies'] = {}

data['devDependencies']['electron'] = '38.3.0'
data['devDependencies']['electron-builder'] = '26.0.12'

if 'dependencies' in data:
    data['dependencies'].pop('electron', None)
    data['dependencies'].pop('electron-builder', None)

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('✅ package.json fixed')
EOF

# Step 2: Remove cpu-features
echo ""
echo "Step 2: Removing optional cpu-features..."
rm -rf node_modules/cpu-features
echo "✅ cpu-features removed"

# Step 3: Rebuild native modules for Electron
echo ""
echo "Step 3: Rebuilding native modules for Electron..."
npx electron-builder install-app-deps --platform=darwin --arch=x64 2>&1 | grep -E "(preparing|finished|completed)"

# Step 4: Create optimized electron-builder config
echo ""
echo "Step 4: Creating build configuration..."
cat > electron-builder-bundled.yml << 'EOFCONFIG'
appId: com.arus.marine.monitoring
productName: ARUS Marine Monitoring
copyright: Copyright © 2025 ARUS

directories:
  buildResources: electron/build
  output: dist/electron

files:
  - electron/main.js
  - electron/preload.js
  - electron/icon.png
  - package.json

extraResources:
  - from: "dist/index.js"
    to: "app/dist/index.js"
  - from: "electron/app-package/package.json"
    to: "app/package.json"
  - from: "node_modules/@tensorflow"
    to: "app/node_modules/@tensorflow"
  - from: "node_modules/@libsql"
    to: "app/node_modules/@libsql"
  - from: "node_modules/serialport"
    to: "app/node_modules/serialport"
  - from: "node_modules/@serialport"
    to: "app/node_modules/@serialport"
  - from: "node_modules/bufferutil"
    to: "app/node_modules/bufferutil"
  - from: "node_modules/ws"
    to: "app/node_modules/ws"
  - from: "node_modules/drizzle-orm"
    to: "app/node_modules/drizzle-orm"

mac:
  category: public.app-category.productivity
  target: tar.gz
  hardenedRuntime: false
  gatekeeperAssess: false
  identity: null
  extraResources:
    - from: "electron/nodejs"
      to: "nodejs"

compression: normal
asar: true
asarUnpack:
  - "**/*.node"
EOFCONFIG

# Step 5: Build macOS installer
echo ""
echo "Step 5: Building macOS installer..."
rm -rf dist/electron dist/installers
mkdir -p dist/installers

npx electron-builder --mac --x64 --config electron-builder-bundled.yml

# Step 6: Results
echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="

if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/
    echo ""
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "To install:"
    echo "  tar -xzf dist/installers/ARUS-*.tar.gz"
    echo "  cp -r 'ARUS Marine Monitoring.app' /Applications/"
else
    echo "❌ Build failed"
    exit 1
fi
