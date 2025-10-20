#!/bin/bash
# Quick macOS build - skip code signing, use tar.gz only

set -e

echo "🚀 Quick macOS Build (tar.gz only, no code signing)"
echo "===================================================="

# Build with explicit settings to avoid hanging
npx electron-builder \
  --mac \
  --x64 \
  --config electron-builder.yml \
  --config.mac.identity=null \
  --config.mac.target=tar.gz \
  --config.compression=normal \
  --config.mac.hardenedRuntime=false \
  --config.mac.gatekeeperAssess=false \
  --config.mac.notarize=false

echo ""
echo "✅ BUILD COMPLETE!"
echo "=================="
echo ""

if ls dist/electron/*.tar.gz 1> /dev/null 2>&1; then
    mkdir -p dist/installers
    mv dist/electron/*.tar.gz dist/installers/ 2>/dev/null || true
    echo "📦 Installer:"
    ls -lh dist/installers/*.tar.gz
    echo ""
    echo "Size: $(du -sh dist/installers/*.tar.gz | cut -f1)"
fi
