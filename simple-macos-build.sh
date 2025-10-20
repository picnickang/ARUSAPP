#!/bin/bash
# Simple macOS build - skip the 2.2GB node_modules copy

set -e

echo "🎯 Simple macOS Build"
echo "====================="
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

# Remove cpu-features
rm -rf node_modules/cpu-features

# Create patched config without node_modules copy
echo ""
echo "Creating optimized build config..."
cat > electron-builder-fast.yml << 'EOFCONFIG'
appId: com.arus.marine.monitoring
productName: ARUS Marine Monitoring
copyright: Copyright © 2025 ARUS

directories:
  buildResources: electron/build
  output: dist/electron

files:
  - electron/**/*
  - package.json
  - "!node_modules"

extraResources:
  - from: "dist"
    to: "app/dist"
    filter:
      - "**/*"
  - from: "electron/app-package/package.json"
    to: "app/package.json"

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
EOFCONFIG

# Build
echo ""
echo "Building (this will be fast - no node_modules copy)..."
rm -rf dist/electron
npx electron-builder install-app-deps --platform=darwin --arch=x64 2>&1 | grep -E "(finished|completed)" || true
npx electron-builder --mac --x64 --config electron-builder-fast.yml

# Results
echo ""
if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mkdir -p dist/installers
    mv dist/electron/*.tar.gz dist/installers/
    echo "✅ BUILD COMPLETE!"
    echo ""
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "⚠️  NOTE: This build does NOT include node_modules"
    echo "The app will use the bundled server code from dist/index.js"
    echo ""
    echo "To install: tar -xzf dist/installers/*.tar.gz"
else
    echo "❌ Build failed"
fi
