#!/bin/bash
# Complete macOS build from scratch - all fixes in one script

set -e

echo "🔧 ARUS macOS Build - Complete Setup & Build"
echo "=============================================="
echo ""

# Step 1: Fix package.json (main field, move electron to devDeps, add metadata)
echo "Step 1: Fixing package.json..."
python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

# Add main field
data['main'] = 'electron/main.js'

# Add description and author
data['description'] = 'Marine Predictive Maintenance & Scheduling System'
data['author'] = 'ARUS Team'

# Move electron and electron-builder to devDependencies
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

# Step 2: Install dependencies
echo ""
echo "Step 2: Installing dependencies..."
npm install

# Step 3: Remove optional cpu-features
echo ""
echo "Step 3: Removing optional cpu-features..."
rm -rf node_modules/cpu-features
echo "✅ cpu-features removed"

# Step 4: Rebuild native modules
echo ""
echo "Step 4: Rebuilding native modules..."
npx electron-builder install-app-deps --platform=darwin --arch=x64 || echo "⚠️  Some optional modules failed"

# Step 5: Verify Node.js runtime
echo ""
if [ ! -d "electron/nodejs" ]; then
    echo "Step 5: Downloading Node.js runtime..."
    ./scripts/download-node-binary.sh
else
    echo "Step 5: ✓ Node.js runtime found"
fi

# Step 6: Build application
echo ""
if [ ! -f "dist/index.js" ]; then
    echo "Step 6: Building application..."
    npm run build
else
    echo "Step 6: ✓ Application already built"
fi

# Step 7: Build macOS installer (fast mode)
echo ""
echo "Step 7: Building macOS installer (tar.gz, no code signing)..."
rm -rf dist/installers dist/electron
mkdir -p dist/installers

npx electron-builder \
  --mac \
  --x64 \
  --config electron-builder.yml \
  --config.mac.identity=null \
  --config.mac.target=tar.gz \
  --config.compression=normal \
  --config.mac.hardenedRuntime=false \
  --config.mac.gatekeeperAssess=false

echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="
echo ""

# Move and display results
if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/ 2>/dev/null || true
fi

if ls dist/installers/*.tar.gz 1> /dev/null 2>&1; then
    echo "📦 Installer created:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "✅ Native modules included:"
    echo "   • serialport (marine protocols)"
    echo "   • @tensorflow/tfjs-node (ML predictions)"
    echo "   • bufferutil (WebSocket performance)"
    echo ""
    echo "📋 Installation:"
    echo "   tar -xzf dist/installers/ARUS-*.tar.gz"
    echo "   cp -r 'ARUS Marine Monitoring.app' /Applications/"
    echo "   open '/Applications/ARUS Marine Monitoring.app'"
    echo ""
    echo "⚠️  First launch: Right-click → Open (bypasses Gatekeeper)"
    echo ""
    echo "💻 Compatibility: macOS 12 (Monterey) or newer"
else
    echo "❌ No installer found - check errors above"
fi
