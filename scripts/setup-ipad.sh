#!/bin/bash
# Setup ARUS for iPad Development
# Installs Capacitor and creates iOS project

set -e

echo "📱 ARUS iPad App Setup"
echo "======================"
echo ""

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Warning: iOS development requires macOS with Xcode installed"
    echo "You can still install Capacitor dependencies, but building for iOS requires a Mac."
    echo ""
fi

# Install Capacitor
echo "Step 1/5: Installing Capacitor dependencies..."
npm install @capacitor/core @capacitor/cli --save-dev
npm install @capacitor/ios
npm install @capacitor-community/sqlite
npm install @capacitor/camera
npm install @capacitor/filesystem
npm install @capacitor/network
npm install @capacitor/splash-screen

echo ""
echo "Step 2/5: Creating Capacitor configuration..."

# Create capacitor.config.ts
cat > capacitor.config.ts << 'EOF'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arus.marine',
  appName: 'ARUS Marine Monitoring',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SQLite: {
      iosDatabaseLocation: 'Library/LocalDatabase'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: false
    }
  }
};

export default config;
EOF

echo "✅ Capacitor configuration created"

# Build the web app
echo ""
echo "Step 3/5: Building web application..."
npm run build

# Initialize Capacitor (if not already done)
echo ""
echo "Step 4/5: Initializing Capacitor..."
if [ ! -d "ios" ]; then
    npx cap add ios
else
    echo "iOS platform already exists, syncing..."
    npx cap sync ios
fi

echo ""
echo "Step 5/5: Setting up build script..."

# Create iPad build script
cat > build-ipad.sh << 'EOF'
#!/bin/bash
# Build ARUS for iPad

set -e

echo "📱 Building ARUS for iPad..."

# Build web app
npm run build

# Sync to iOS
npx cap sync ios

echo ""
echo "✅ iPad build complete!"
echo ""
echo "To open in Xcode:"
echo "  npx cap open ios"
echo ""
EOF

chmod +x build-ipad.sh

echo ""
echo "=========================================="
echo "✅ iPad Development Setup Complete!"
echo "=========================================="
echo ""
echo "What was installed:"
echo "  ✅ Capacitor core"
echo "  ✅ iOS platform"
echo "  ✅ SQLite plugin"
echo "  ✅ Native plugins (Camera, Filesystem, Network)"
echo ""
echo "Files created:"
echo "  📄 capacitor.config.ts"
echo "  📄 build-ipad.sh"
echo "  📁 ios/ (Xcode project)"
echo ""
echo "Next steps:"
echo ""
echo "1. Open in Xcode:"
echo "   npx cap open ios"
echo ""
echo "2. Select iPad device/simulator"
echo ""
echo "3. Click Play to run the app"
echo ""
echo "For production builds, see docs/IPAD_APP_GUIDE.md"
echo ""
echo "Note: You'll need to refactor the backend to work"
echo "with mobile services. See the guide for details."
echo ""
