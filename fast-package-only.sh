#!/bin/bash
# Fast packaging - skip rebuild, just package what's already built

set -e

echo "🚀 Fast macOS Package - Skip Rebuild"
echo "====================================="
echo ""

# Fix package.json
echo "Fixing package.json..."
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
EOF

rm -rf node_modules/cpu-features 2>/dev/null || true

# Create config
cat > electron-builder-quick.yml << 'EOFCONFIG'
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

echo ""
echo "Building (using already-rebuilt native modules)..."
rm -rf dist/electron dist/installers
mkdir -p dist/installers

# Build without rebuild step
npx electron-builder --mac --x64 --config electron-builder-quick.yml --dir

echo ""
if [ -d "dist/electron/mac/ARUS Marine Monitoring.app" ]; then
    echo "✅ App built successfully!"
    echo ""
    echo "Creating archive..."
    cd dist/electron/mac
    tar -czf "ARUS-Marine-Monitoring-1.0.0-mac.tar.gz" "ARUS Marine Monitoring.app"
    mv "ARUS-Marine-Monitoring-1.0.0-mac.tar.gz" ../../installers/
    cd ../../..
    
    echo ""
    echo "✅ BUILD COMPLETE!"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
    echo ""
    echo "To install:"
    echo "  cd dist/installers"
    echo "  tar -xzf ARUS-*.tar.gz"
    echo "  cp -r 'ARUS Marine Monitoring.app' /Applications/"
    echo "  open '/Applications/ARUS Marine Monitoring.app'"
fi
