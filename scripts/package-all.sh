#!/bin/bash
# ARUS Complete Packaging Script
# Builds all distribution packages

set -e

echo "🚢 ARUS Complete Packaging System"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERSION=$(node -p "require('./package.json').version")
echo "Version: $VERSION"
echo ""

# Create dist directory structure
mkdir -p dist/{standalone,electron,docker,msi,pkg}

# 1. Build the application
echo -e "${BLUE}Step 1: Building application...${NC}"
chmod +x scripts/build-commonjs.sh
./scripts/build-commonjs.sh
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# 2. Create standalone executables
echo -e "${BLUE}Step 2: Creating standalone executables...${NC}"
echo "Installing pkg globally..."
npm install -g pkg

echo "Building Windows executable..."
pkg dist/cjs/index.js --targets node20-win-x64 --output dist/standalone/arus-win-$VERSION.exe --compress GZip

echo "Building macOS executables..."
pkg dist/cjs/index.js --targets node20-macos-x64 --output dist/standalone/arus-macos-intel-$VERSION --compress GZip
pkg dist/cjs/index.js --targets node20-macos-arm64 --output dist/standalone/arus-macos-arm-$VERSION --compress GZip

echo "Building Linux executable..."
pkg dist/cjs/index.js --targets node20-linux-x64 --output dist/standalone/arus-linux-$VERSION --compress GZip

echo -e "${GREEN}✅ Standalone executables created${NC}"
echo ""

# 3. Build Docker image
echo -e "${BLUE}Step 3: Building Docker image...${NC}"
docker build -t arus:$VERSION -t arus:latest .
docker save arus:$VERSION | gzip > dist/docker/arus-$VERSION.tar.gz
echo -e "${GREEN}✅ Docker image created and exported${NC}"
echo ""

# 4. Build Electron apps (if electron-builder is installed)
if command -v electron-builder &> /dev/null; then
    echo -e "${BLUE}Step 4: Building Electron applications...${NC}"
    npm install electron electron-builder --save-dev
    
    # Build for all platforms
    electron-builder -mwl
    
    # Move to dist folder
    mv dist/*.exe dist/electron/ 2>/dev/null || true
    mv dist/*.dmg dist/electron/ 2>/dev/null || true
    mv dist/*.AppImage dist/electron/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ Electron applications created${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Electron build (electron-builder not installed)${NC}"
    echo "Install with: npm install -g electron-builder"
fi
echo ""

# 5. Generate checksums
echo -e "${BLUE}Step 5: Generating checksums...${NC}"
cd dist/standalone
sha256sum * > checksums.txt
cd ../..
echo -e "${GREEN}✅ Checksums generated${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}🎉 Packaging Complete!${NC}"
echo "=================================="
echo ""
echo "Packages created:"
echo ""
echo "📦 Standalone Executables:"
echo "   └─ dist/standalone/arus-win-$VERSION.exe (Windows)"
echo "   └─ dist/standalone/arus-macos-intel-$VERSION (macOS Intel)"
echo "   └─ dist/standalone/arus-macos-arm-$VERSION (macOS Apple Silicon)"
echo "   └─ dist/standalone/arus-linux-$VERSION (Linux)"
echo ""
echo "🐳 Docker Image:"
echo "   └─ dist/docker/arus-$VERSION.tar.gz"
echo "   └─ Docker Hub: arus:$VERSION, arus:latest"
echo ""
echo "🖥️  Electron Apps:"
ls dist/electron/ 2>/dev/null | sed 's/^/   └─ dist\/electron\//' || echo "   └─ (not built)"
echo ""
echo "Total size:"
du -sh dist/
echo ""
echo "Upload these files to your distribution server!"
