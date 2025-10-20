#!/bin/bash
# Comprehensive macOS build with bundled dependencies
# Review: Bundles JS code, copies only native modules (~696MB vs 2.2GB)

set -e

echo "🎯 ARUS macOS Build - Bundled Dependencies"
echo "==========================================="
echo ""
echo "Strategy:"
echo "  • Bundle JS dependencies into dist/index.js"
echo "  • Keep native modules external (~696MB)"
echo "  • Result: Fast build, working app"
echo ""

# Step 1: Fix package.json
echo "Step 1: Fixing package.json..."
python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

# Add required fields
data['main'] = 'electron/main.js'
data['description'] = 'Marine Predictive Maintenance & Scheduling System'
data['author'] = 'ARUS Team'

# Move electron to devDependencies
if 'devDependencies' not in data:
    data['devDependencies'] = {}

data['devDependencies']['electron'] = '38.3.0'
data['devDependencies']['electron-builder'] = '26.0.12'

if 'dependencies' in data:
    data['dependencies'].pop('electron', None)
    data['dependencies'].pop('electron-builder', None)

# Update build script to bundle dependencies
# Keep native modules external (they can't be bundled)
data['scripts']['build'] = 'vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:@tensorflow/tfjs-node --external:@libsql/client --external:serialport --external:@serialport/* --external:bufferutil --external:ws'

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('✅ package.json updated')
print('  • Build script now bundles dependencies')
print('  • Native modules marked as external')
EOF

# Step 2: Rebuild server with bundled dependencies
echo ""
echo "Step 2: Rebuilding server (bundling dependencies)..."
npm run build

echo "✅ Server built with bundled dependencies"
echo ""
echo "Analyzing bundle size..."
ls -lh dist/index.js | awk '{print "  dist/index.js: " $5}'

# Step 3: Remove problematic cpu-features
echo ""
echo "Step 3: Removing optional cpu-features..."
rm -rf node_modules/cpu-features
echo "✅ cpu-features removed"

# Step 4: Rebuild native modules for Electron
echo ""
echo "Step 4: Rebuilding native modules for Electron..."
npx electron-builder install-app-deps --platform=darwin --arch=x64 2>&1 | grep -E "(preparing|finished|completed)"

# Step 5: Create optimized electron-builder config
echo ""
echo "Step 5: Creating optimized build configuration..."
cat > electron-builder-bundled.yml << 'EOFCONFIG'
appId: com.arus.marine.monitoring
productName: ARUS Marine Monitoring
copyright: Copyright © 2025 ARUS

directories:
  buildResources: electron/build
  output: dist/electron

# Include Electron wrapper code
files:
  - electron/main.js
  - electron/preload.js
  - electron/icon.png
  - package.json

# Server code + ONLY native modules (not all node_modules)
extraResources:
  # Bundled server code
  - from: "dist/index.js"
    to: "app/dist/index.js"
  
  # Package.json for app
  - from: "electron/app-package/package.json"
    to: "app/package.json"
  
  # Native modules ONLY (~696MB vs 2.2GB)
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

# macOS Configuration
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

echo "✅ Build config created (copies only native modules)"

# Step 6: Build macOS installer
echo ""
echo "Step 6: Building macOS installer..."
rm -rf dist/electron dist/installers
mkdir -p dist/installers

npx electron-builder --mac --x64 --config electron-builder-bundled.yml

# Step 7: Show results
echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="
echo ""

if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/ 2>/dev/null || true
    
    echo "📦 Installer created:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "✅ What's included:"
    echo "   • Bundled server code (most dependencies compiled in)"
    echo "   • Native modules: TensorFlow (673MB), SQLite (20MB), serialport (2.9MB)"
    echo "   • Node.js runtime (147MB)"
    echo "   • Total: ~850MB (vs previous 8.2GB bloat)"
    echo ""
    echo "📋 To install:"
    echo "   tar -xzf dist/installers/ARUS-*.tar.gz"
    echo "   cp -r 'ARUS Marine Monitoring.app' /Applications/"
    echo "   open '/Applications/ARUS Marine Monitoring.app'"
    echo ""
    echo "⚠️  First launch: Right-click → Open (bypasses Gatekeeper)"
    echo "💻 Requires: macOS 12 (Monterey) or newer"
    echo ""
    echo "📝 Expected behavior:"
    echo "   1. App launches → shows window"
    echo "   2. Server starts on port 5000"
    echo "   3. If port 5000 busy: dialog asks to quit or continue"
    echo "   4. Dashboard loads at http://localhost:5000"
    echo "   5. Logs saved to: ~/.arus/logs/server-*.log"
else
    echo "❌ Build failed - check errors above"
    exit 1
fi
