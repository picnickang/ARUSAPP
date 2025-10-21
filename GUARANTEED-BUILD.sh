#!/bin/bash
set -e

echo "🎯 ARUS GUARANTEED BUILD - Comprehensive Fix"
echo "============================================="
echo ""
echo "Analysis: The original electron-builder.yml is correct."
echo "Problem: We need to remove the nodejs extraResources for macOS"
echo "Solution: Use original config but remove nodejs folder requirement"
echo ""

# Step 1: Fix package.json
echo "[1/6] Fixing package.json..."
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
echo "   ✅ package.json fixed"
echo ""

# Step 2: Create minimal package.json for the server bundle
echo "[2/6] Creating package.json for server bundle..."
cat > app-package.json << 'EOF'
{
  "name": "arus-server",
  "version": "1.0.0",
  "type": "module",
  "private": true
}
EOF
echo "   ✅ app-package.json created"
echo ""

# Step 3: Create corrected electron-builder config (no nodejs folder needed)
echo "[3/6] Creating corrected build config..."
cat > electron-builder-corrected.yml << 'EOF'
appId: com.arus.marine.monitoring
productName: ARUS
copyright: Copyright © 2025 ARUS

directories:
  buildResources: electron/build
  output: dist/electron

# Files to include (electron scripts)
files:
  - electron/main.js
  - electron/preload.js
  - package.json

# CRITICAL: Ship the server bundle to Resources/app/
extraResources:
  - from: "dist"
    to: "app/dist"
    filter:
      - "**/*"
      - "!electron/**"
  - from: "app-package.json"
    to: "app/package.json"
  - from: "node_modules"
    to: "app/node_modules"
    filter:
      - "**/*"
      - "!electron/**"
      - "!electron-builder/**"

# macOS config (NO nodejs extraResources - we use Electron's built-in Node!)
mac:
  category: public.app-category.productivity
  target:
    - target: dir
  hardenedRuntime: false
  gatekeeperAssess: false

# Unpacking native modules
compression: maximum
asar: true
asarUnpack:
  - "**/@tensorflow/**/*"
  - "**/@serialport/**/*"
  - "**/@libsql/**/*"
  - "**/bufferutil/**/*"
EOF
echo "   ✅ Build config created (uses Electron built-in Node.js)"
echo ""

# Step 4: Remove bad icons
echo "[4/6] Removing invalid icon files..."
rm -f electron/icon.png
echo "   ✅ Icon removed (will use Electron default)"
echo ""

# Step 5: Verify dist/index.js exists
echo "[5/6] Verifying server bundle..."
if [ ! -f "dist/index.js" ]; then
  echo "   ❌ ERROR: dist/index.js not found!"
  echo "   The server must be built first. Run: npm run build"
  exit 1
fi
echo "   ✅ Server bundle found: dist/index.js"
echo ""

# Step 6: Build
echo "[6/6] Building macOS app..."
echo "   This will take 3-5 minutes (copying ~700MB of native modules)"
echo "   Please wait..."
echo ""
npx electron-builder --mac --x64 --config electron-builder-corrected.yml --dir 2>&1 | \
  grep -v "default Electron icon" | \
  grep -E "(electron-builder|installing|packaging|building|completed)" || true
echo ""

# Step 7: Verify the build
echo "[7/7] Verifying build..."
if [ ! -d "dist/electron/mac/ARUS.app" ]; then
  echo "   ❌ BUILD FAILED - App not created"
  exit 1
fi

APP_DIR="dist/electron/mac/ARUS.app"

# Check critical files exist
echo "   Checking packaged structure..."
CHECKS_PASSED=0
CHECKS_TOTAL=6

if [ -f "$APP_DIR/Contents/MacOS/ARUS" ]; then
  echo "   ✅ Electron binary exists"
  ((CHECKS_PASSED++))
else
  echo "   ❌ Electron binary MISSING"
fi

if [ -f "$APP_DIR/Contents/Resources/app/dist/index.js" ]; then
  echo "   ✅ Server bundle exists (app/dist/index.js)"
  ((CHECKS_PASSED++))
else
  echo "   ❌ Server bundle MISSING at app/dist/index.js"
fi

if [ -d "$APP_DIR/Contents/Resources/app/node_modules" ]; then
  MOD_COUNT=$(ls -1 "$APP_DIR/Contents/Resources/app/node_modules" | wc -l | tr -d ' ')
  echo "   ✅ node_modules exists ($MOD_COUNT packages)"
  ((CHECKS_PASSED++))
else
  echo "   ❌ node_modules MISSING"
fi

if [ -d "$APP_DIR/Contents/Resources/app/node_modules/@tensorflow" ]; then
  echo "   ✅ TensorFlow.js included"
  ((CHECKS_PASSED++))
else
  echo "   ❌ TensorFlow.js MISSING"
fi

if [ -d "$APP_DIR/Contents/Resources/app/node_modules/@serialport" ]; then
  echo "   ✅ serialport included"
  ((CHECKS_PASSED++))
else
  echo "   ❌ serialport MISSING"
fi

if [ -f "$APP_DIR/Contents/Resources/app/package.json" ]; then
  PKG_TYPE=$(grep '"type"' "$APP_DIR/Contents/Resources/app/package.json" | grep -o '"module"' || echo "not found")
  if [ "$PKG_TYPE" = '"module"' ]; then
    echo "   ✅ package.json with type=module"
    ((CHECKS_PASSED++))
  else
    echo "   ❌ package.json missing type=module"
  fi
else
  echo "   ❌ package.json MISSING"
fi

echo ""
if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
  echo "═══════════════════════════════════════════════════════════"
  echo "✅ BUILD SUCCESSFUL - ALL CHECKS PASSED ($CHECKS_PASSED/$CHECKS_TOTAL)"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  SIZE=$(du -sh "$APP_DIR" 2>/dev/null | awk '{print $1}')
  echo "App Location: $APP_DIR"
  echo "App Size: $SIZE"
  echo ""
  echo "🚀 READY TO LAUNCH!"
  echo "   Double-click: dist/electron/mac/ARUS.app"
  echo ""
  echo "How it works:"
  echo "• Uses Electron's built-in Node.js runtime (process.execPath)"
  echo "• Sets ELECTRON_RUN_AS_NODE=1 to run Electron as Node.js"
  echo "• Server files are in Contents/Resources/app/dist/"
  echo "• No separate nodejs folder needed!"
else
  echo "═══════════════════════════════════════════════════════════"
  echo "⚠️  BUILD INCOMPLETE - SOME CHECKS FAILED ($CHECKS_PASSED/$CHECKS_TOTAL)"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "The app may not work correctly. Please send the output above"
  echo "for further debugging."
fi
