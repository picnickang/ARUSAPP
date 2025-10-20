#!/bin/bash
# Fast macOS build - production dependencies only

set -e

echo "🚀 Fast macOS Build (production deps only)"
echo "==========================================="
echo ""

# Step 1: Create production node_modules
echo "Step 1: Creating production node_modules..."
mkdir -p electron/app-bundle
cd electron/app-bundle

# Copy package.json (production deps only)
cp ../app-package/package.json ./

# Install ONLY production dependencies (no dev tools)
echo "Installing production dependencies (this is much smaller)..."
npm install --production --omit=dev

cd ../..
echo "✅ Production node_modules created ($(du -sh electron/app-bundle/node_modules | cut -f1))"

# Step 2: Build with minimal config
echo ""
echo "Step 2: Building macOS app (fast mode)..."
rm -rf dist/electron
mkdir -p dist/installers

npx electron-builder \
  --mac \
  --x64 \
  --config.appId=com.arus.marine.monitoring \
  --config.productName="ARUS Marine Monitoring" \
  --config.directories.output=dist/electron \
  --config.files='["electron/main.js","electron/preload.js","electron/icon.png","package.json"]' \
  --config.extraResources='[{"from":"dist/index.js","to":"app/dist/index.js"},{"from":"electron/app-package/package.json","to":"app/package.json"},{"from":"electron/app-bundle/node_modules","to":"app/node_modules"},{"from":"electron/nodejs","to":"nodejs"}]' \
  --config.mac.target=tar.gz \
  --config.mac.identity=null \
  --config.mac.hardenedRuntime=false \
  --config.compression=normal \
  --config.asar=true

echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="

if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mv dist/electron/*.tar.gz dist/installers/
    echo ""
    echo "📦 Installer: $(ls -lh dist/installers/*.tar.gz | awk '{print $9, $5}')"
    echo ""
    echo "✅ To install:"
    echo "   tar -xzf dist/installers/ARUS-*.tar.gz"
    echo "   cp -r 'ARUS Marine Monitoring.app' /Applications/"
fi
