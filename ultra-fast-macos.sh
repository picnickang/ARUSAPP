#!/bin/bash
set -e

echo "⚡ ULTRA FAST macOS Build - Directory Only"
echo "=========================================="
echo ""

# Fix package.json
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
echo "✅ Done"
echo ""

# Remove undersized icon to avoid validation error
echo "Removing undersized icon (will use default Electron icon)..."
rm -f electron/icon.png
echo "✅ Done"
echo ""

# Create ultra-minimal config
echo "Creating minimal build config..."
cat > electron-builder-dir.yml << 'EOF'
appId: com.arus.marine
productName: ARUS
directories:
  output: dist/electron
  buildResources: electron
files:
  - dist/**/*
  - electron/**/*
  - node_modules/@serialport/**/*
  - node_modules/@tensorflow/**/*
  - node_modules/@libsql/**/*
  - node_modules/bufferutil/**/*
  - "!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
  - "!node_modules/*.d.ts"
  - "!node_modules/.bin"
  - "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}"
  - "!.editorconfig"
  - "!**/._*"
  - "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}"
  - "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}"
  - "!**/{appveyor.yml,.travis.yml,circle.yml}"
  - "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
mac:
  target:
    - target: dir
  category: public.app-category.productivity
asarUnpack:
  - "**/@tensorflow/**/*"
  - "**/@serialport/**/*"
  - "**/@libsql/**/*"
  - "**/bufferutil/**/*"
EOF
echo "✅ Done"
echo ""

# Build with --dir flag (no compression, no installer)
echo "Building app (directory only - no compression)..."
npx electron-builder --mac --x64 --config electron-builder-dir.yml --dir
echo ""

if [ -d "dist/electron/mac/ARUS.app" ]; then
  echo "✅ SUCCESS! App built in: dist/electron/mac/ARUS.app"
  echo ""
  echo "You can now:"
  echo "  1. Double-click: dist/electron/mac/ARUS.app"
  echo "  2. Or drag it to /Applications"
  echo ""
  
  # Get size
  SIZE=$(du -sh dist/electron/mac/ARUS.app | awk '{print $1}')
  echo "📦 App size: $SIZE"
  echo ""
  echo "Note: App uses default Electron icon (you can add custom icon later)"
else
  echo "❌ Build failed - app not found"
  exit 1
fi
