#!/bin/bash
set -e

echo "🚀 ARUS Fast Build (No external Node.js needed!)"
echo "================================================"
echo ""

# Step 1: Fix package.json
echo "Fixing package.json..."
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

# Step 3: Simple build config (no extraResources needed!)
cat > electron-builder-fast.yml << 'EOF'
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

# Step 4: Build
echo "Building app (this will be faster!)..."
npx electron-builder --mac --x64 --config electron-builder-fast.yml --dir 2>&1 | grep -v "default Electron icon"
echo ""

# Step 5: Verify
if [ ! -d "dist/electron/mac/ARUS.app" ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ BUILD COMPLETE!"
echo ""
echo "App location: dist/electron/mac/ARUS.app"
SIZE=$(du -sh dist/electron/mac/ARUS.app 2>/dev/null | awk '{print $1}')
echo "App size: $SIZE (much smaller without external Node.js!)"
echo ""
echo "🎯 Double-click the app to launch ARUS!"
echo ""
echo "Note: The app now uses Electron's built-in Node.js runtime,"
echo "      so no separate nodejs folder is needed. This makes builds"
echo "      faster and the app more reliable!"
