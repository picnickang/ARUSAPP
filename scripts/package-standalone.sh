#!/bin/bash
# Build standalone executables only
# These are single-file executables with Node.js bundled - perfect for vessels

set -e

echo "📦 Building Standalone Executables"
echo "===================================="
echo ""

VERSION=$(node -p "require('./package.json').version")
mkdir -p dist/standalone

# Build application as CommonJS (pkg requires CJS, not ESM)
echo "Building application (CommonJS for pkg)..."
chmod +x scripts/build-commonjs.sh
./scripts/build-commonjs.sh

# Install pkg if not available
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg globally..."
    npm install -g pkg
fi

# Build for each platform
echo ""
echo "Building Windows executable..."
pkg dist/cjs/index.js \
  --targets node20-win-x64 \
  --output dist/standalone/arus-win-$VERSION.exe \
  --compress GZip

echo ""
echo "Building macOS (Intel) executable..."
pkg dist/cjs/index.js \
  --targets node20-macos-x64 \
  --output dist/standalone/arus-macos-intel-$VERSION \
  --compress GZip

echo ""
echo "Building macOS (Apple Silicon) executable..."
pkg dist/cjs/index.js \
  --targets node20-macos-arm64 \
  --output dist/standalone/arus-macos-arm-$VERSION \
  --compress GZip

echo ""
echo "Building Linux executable..."
pkg dist/cjs/index.js \
  --targets node20-linux-x64 \
  --output dist/standalone/arus-linux-$VERSION \
  --compress GZip

# Generate checksums
echo ""
echo "Generating checksums..."
cd dist/standalone
sha256sum * > checksums.txt
cd ../..

# Summary
echo ""
echo "✅ Standalone Executables Built!"
echo "================================="
echo ""
echo "Files created in dist/standalone/:"
ls -lh dist/standalone/
echo ""
echo "These executables include Node.js and require NO installation!"
echo ""
echo "Usage:"
echo "  Windows: arus-win-$VERSION.exe"
echo "  macOS:   ./arus-macos-*-$VERSION"
echo "  Linux:   ./arus-linux-$VERSION"
echo ""
echo "Place .env file in same directory for configuration."
