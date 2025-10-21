#!/bin/bash
set -e

echo "🔧 Building ARUS with Manual Node.js Fix"
echo "========================================="
echo ""

# Step 1: Fix package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.main = 'electron/main.js';
pkg.description = 'Marine Predictive Maintenance & Scheduling System';
pkg.author = 'ARUS Team';
if (pkg.dependencies?.electron) {
  delete pkg.dependencies.electron;
  pkg.devDependencies.electron = '38.3.0';
}
if (pkg.dependencies?.['electron-builder']) {
  const version = pkg.dependencies['electron-builder'];
  delete pkg.dependencies['electron-builder'];
  pkg.devDependencies['electron-builder'] = version;
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Step 2: Remove bad icon
rm -f electron/icon.png

# Step 3: Check Node.js runtime exists
if [ ! -d "electron/nodejs" ]; then
  echo "❌ CRITICAL: electron/nodejs folder is missing!"
  echo ""
  echo "This download is incomplete. You MUST download a fresh copy from Replit."
  echo "The Node.js runtime (147MB) is required but not present."
  exit 1
fi

echo "✅ Found Node.js runtime"
echo ""

# Step 4: Simple build config
cat > electron-builder-simple.yml << 'EOF'
appId: com.arus.marine
productName: ARUS
directories:
  output: dist/electron
files:
  - dist/**/*
  - electron/main.js
  - electron/preload.js
  - node_modules/@serialport/**/*
  - node_modules/@tensorflow/**/*
  - node_modules/@libsql/**/*
  - node_modules/bufferutil/**/*
mac:
  target:
    - target: dir
asarUnpack:
  - "**/@tensorflow/**/*"
  - "**/@serialport/**/*"
EOF

# Step 5: Build
echo "Building app..."
npx electron-builder --mac --x64 --config electron-builder-simple.yml --dir 2>&1 | grep -v "default Electron icon"
echo ""

# Step 6: MANUALLY copy Node.js runtime (electron-builder failed to do this)
if [ ! -d "dist/electron/mac/ARUS.app" ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "Manually copying Node.js runtime into app..."
RESOURCES_DIR="dist/electron/mac/ARUS.app/Contents/Resources"
mkdir -p "$RESOURCES_DIR"

if [ -d "$RESOURCES_DIR/nodejs" ]; then
  echo "  • Removing old nodejs folder..."
  rm -rf "$RESOURCES_DIR/nodejs"
fi

echo "  • Copying electron/nodejs → app..."
cp -R electron/nodejs "$RESOURCES_DIR/"

# Step 7: Verify
if [ -f "$RESOURCES_DIR/nodejs/bin/node" ]; then
  echo "  ✅ Node.js runtime successfully copied"
  NODE_VERSION=$("$RESOURCES_DIR/nodejs/bin/node" --version 2>/dev/null || echo "unknown")
  echo "  • Version: $NODE_VERSION"
else
  echo "  ❌ FAILED to copy Node.js runtime"
  exit 1
fi
echo ""

# Final verification
echo "✅ BUILD COMPLETE!"
echo ""
echo "App location: dist/electron/mac/ARUS.app"
SIZE=$(du -sh dist/electron/mac/ARUS.app | awk '{print $1}')
echo "App size: $SIZE"
echo ""
echo "Double-click the app to launch ARUS!"
