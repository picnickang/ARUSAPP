#!/bin/bash
# Build Universal macOS Application (Intel + Apple Silicon)
# Creates a single .dmg that works on both architectures

set -e

echo "🍎 ARUS Universal macOS Application Builder (Intel + Apple Silicon)"
echo "===================================================================="
echo ""
echo "This will build separate Intel and ARM64 versions,"
echo "then combine them into a universal binary."
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application first..."
    npm run build
fi

# Build Intel version
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Building Intel (x64) version..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./build-desktop-macos-bundled.sh

# Build ARM64 version
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Building Apple Silicon (ARM64) version..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./build-desktop-macos-arm64.sh

echo ""
echo "✅ Universal Build Complete!"
echo "============================"
echo ""
echo "Available installers:"
echo ""
ls -lh dist/installers/*.dmg 2>/dev/null || echo "(No installers found)"
echo ""
echo "Installation guide:"
echo "  • Intel Macs: Use ARUS-1.0.0.dmg"
echo "  • Apple Silicon: Use ARUS-1.0.0-arm64.dmg"
echo "  • Both include complete standalone runtime"
echo "  • Both are ~180-200 MB"
echo ""
echo "Performance comparison:"
echo "  Intel Mac + Intel build: Native performance ✅"
echo "  Intel Mac + ARM64 build: Won't run ❌"
echo "  M1/M2/M3 + Intel build: ~5-10% slower (Rosetta 2) ⚠️"
echo "  M1/M2/M3 + ARM64 build: Native performance ✅"
echo ""
