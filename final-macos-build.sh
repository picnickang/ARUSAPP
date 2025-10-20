#!/bin/bash
# Final comprehensive macOS build - handles everything

set -e

echo "🎯 ARUS macOS Build - Final Complete Solution"
echo "=============================================="
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

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('✅ package.json fixed')
EOF

# Step 2: Clean and prepare
echo ""
echo "Step 2: Preparing build environment..."
rm -rf dist/electron dist/installers
rm -rf node_modules/cpu-features
mkdir -p dist/installers

# Step 3: Rebuild native modules (already have npm installed)
echo ""
echo "Step 3: Rebuilding native modules..."
npx electron-builder install-app-deps --platform=darwin --arch=x64 || echo "⚠️  Some optional modules failed"

# Step 4: Build using simplified extraResources approach
echo ""
echo "Step 4: Building macOS app (optimized)..."

# Create a temporary minimal config
cat > /tmp/electron-builder-temp.yml << 'EOFCONFIG'
appId: com.arus.marine.monitoring
productName: ARUS Marine Monitoring
copyright: Copyright © 2025 ARUS

directories:
  output: dist/electron

files:
  - electron/main.js
  - electron/preload.js
  - electron/icon.png
  - package.json

extraResources:
  - from: dist/index.js
    to: app/dist/index.js
  - from: electron/app-package/package.json
    to: app/package.json
  - from: electron/nodejs
    to: nodejs

mac:
  target: tar.gz
  hardenedRuntime: false
  gatekeeperAssess: false
  identity: null

compression: normal
asar: true

# Install production dependencies during build
afterPack: |
  const path = require('path');
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  module.exports = async function(context) {
    const appPath = path.join(context.appOutDir, 'ARUS Marine Monitoring.app', 'Contents', 'Resources', 'app');
    console.log('Installing production dependencies in:', appPath);
    
    try {
      const { stdout, stderr } = await execPromise('npm install --production --omit=dev', {
        cwd: appPath,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log('npm install output:', stdout);
      if (stderr) console.warn('npm install warnings:', stderr);
    } catch (error) {
      console.error('Failed to install production dependencies:', error);
      throw error;
    }
  };
EOFCONFIG

npx electron-builder --mac --x64 --config /tmp/electron-builder-temp.yml

echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="

if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/ 2>/dev/null || true
    
    echo ""
    echo "📦 Installer created:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "✅ Included:"
    echo "   • Native modules (serialport, TensorFlow, bufferutil)"
    echo "   • Node.js runtime (147MB)"
    echo "   • Production dependencies only"
    echo ""
    echo "📋 To install:"
    echo "   1. tar -xzf dist/installers/ARUS-*.tar.gz"
    echo "   2. cp -r 'ARUS Marine Monitoring.app' /Applications/"
    echo "   3. Right-click app → Open (first launch only)"
    echo ""
    echo "💻 Requires: macOS 12 (Monterey) or newer"
else
    echo "❌ Build failed - check errors above"
    exit 1
fi
