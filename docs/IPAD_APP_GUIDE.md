# Building ARUS for iPad

**Turn ARUS into a native iPad app using Capacitor**

---

## 📱 What You'll Get

A **native iPad app** that:
- ✅ Runs independently (no browser)
- ✅ Works offline with SQLite
- ✅ Distributable via Apple App Store
- ✅ Access to native iOS features (camera, GPS, notifications)
- ✅ Reuses 80-85% of existing React code
- ✅ Professional native experience

---

## 🚀 Quick Start

### 1. Install Capacitor

```bash
# Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli --save-dev
npm install @capacitor/ios
npm install @capacitor-community/sqlite

# Initialize Capacitor
npx cap init
```

When prompted:
- **App name:** ARUS Marine Monitoring
- **Package ID:** com.arus.marine (or your bundle ID)
- **Web directory:** dist/public

### 2. Configure Capacitor

Create `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arus.marine',
  appName: 'ARUS',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SQLite: {
      iosDatabaseLocation: 'Library/LocalDatabase'
    }
  }
};

export default config;
```

### 3. Build Web App

```bash
npm run build
```

### 4. Add iOS Platform

```bash
# Add iOS platform
npx cap add ios

# Sync web assets
npx cap sync ios
```

### 5. Open in Xcode

```bash
npx cap open ios
```

This opens Xcode where you can:
- Run on iPad Simulator
- Test on physical iPad
- Configure app settings
- Build for App Store

---

## 🔧 Key Adaptations Needed

### A. Backend Service Layer

The current Express backend won't run on iPad. Create a mobile service layer:

**File: `shared/mobile-services/index.ts`**

```typescript
/**
 * Mobile-specific service layer
 * Replaces Express backend for Capacitor apps
 */

import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

export class MobileStorageService {
  private db: any;
  
  async initialize() {
    // Initialize SQLite database
    const sqlite = CapacitorSQLite;
    
    // Create or open database
    this.db = await sqlite.createConnection({
      database: 'arus.db',
      version: 1,
      encrypted: false,
      mode: 'no-encryption'
    });
    
    await this.db.open();
    
    // Run schema migrations
    await this.initializeSchema();
  }
  
  async initializeSchema() {
    // Import Drizzle schema and create tables
    // Reuse existing schema from shared/schema.ts
  }
  
  // Implement storage interface methods
  async getVessels(orgId: string) {
    // Query SQLite directly
  }
  
  async createEquipment(data: any) {
    // Insert into SQLite
  }
  
  // ... other storage methods
}

export const mobileStorage = new MobileStorageService();
```

### B. Platform Detection

**File: `client/src/lib/platform.ts`**

```typescript
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

export function getApiBase() {
  if (isNative) {
    // Use local mobile services
    return 'capacitor://localhost';
  }
  // Use Express backend
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
}
```

### C. SQLite Integration

**File: `shared/mobile-services/sqlite-adapter.ts`**

```typescript
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';

export class SQLiteAdapter {
  private connection: SQLiteDBConnection | null = null;
  
  async connect() {
    const sqlite = CapacitorSQLite;
    
    this.connection = await sqlite.createConnection({
      database: 'arus_vessel.db',
      encrypted: false,
      mode: 'no-encryption',
      version: 1
    });
    
    await this.connection.open();
    return this.connection;
  }
  
  async query(sql: string, params: any[] = []) {
    if (!this.connection) throw new Error('Not connected');
    
    const result = await this.connection.query(sql, params);
    return result.values || [];
  }
  
  async execute(sql: string, params: any[] = []) {
    if (!this.connection) throw new Error('Not connected');
    
    await this.connection.run(sql, params);
  }
  
  // Implement full storage interface
}
```

### D. Update React Query Client

**File: `client/src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';
import { isNative } from './platform';
import { mobileStorage } from '@shared/mobile-services';

export async function apiRequest(url: string, options: RequestInit = {}) {
  if (isNative) {
    // Route to mobile services instead of HTTP
    return handleMobileRequest(url, options);
  }
  
  // Normal HTTP request
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

async function handleMobileRequest(url: string, options: RequestInit) {
  const path = url.replace('/api/', '');
  const [resource, ...params] = path.split('/');
  
  // Route to appropriate mobile service
  switch (resource) {
    case 'vessels':
      return mobileStorage.getVessels(params[0]);
    case 'equipment':
      return mobileStorage.getEquipment(params[0]);
    // ... other routes
  }
}
```

---

## 📦 Build Scripts

Add to your project root:

**File: `build-ipad.sh`**

```bash
#!/bin/bash
# Build ARUS for iPad

set -e

echo "📱 Building ARUS for iPad"
echo "========================="

# Build web app
echo "Building React app..."
npm run build

# Sync to iOS
echo "Syncing to iOS platform..."
npx cap sync ios

# Update native assets
echo "Copying icons and splash screens..."
npx @capacitor/assets generate --ios

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  1. npx cap open ios"
echo "  2. Select iPad device in Xcode"
echo "  3. Click Play to run"
echo ""
```

---

## 🎨 iOS-Specific Optimizations

### Safe Area Handling

**Update `client/src/index.css`:**

```css
/* Handle iOS notches and home indicator */
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --safe-area-right: env(safe-area-inset-right);
}

body {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}
```

### Touch Optimization

```css
/* Optimize for touch on iPad */
button, .clickable {
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
}

/* Disable text selection on UI elements */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}
```

### Orientation Support

In `ios/App/App/Info.plist`, add:

```xml
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationPortraitUpsideDown</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

---

## 📊 Development Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| **Phase 1** | Capacitor setup, iOS platform | 1 week |
| **Phase 2** | Mobile service layer refactor | 3-4 weeks |
| **Phase 3** | SQLite adapter implementation | 2 weeks |
| **Phase 4** | Background sync & offline mode | 2 weeks |
| **Phase 5** | iOS-specific UI polish | 1-2 weeks |
| **Phase 6** | Testing & App Store submission | 2 weeks |
| **Total** | | **10-12 weeks** |

---

## 🔐 App Store Submission

### Requirements

1. **Apple Developer Account** ($99/year)
2. **App Icons** (all required sizes)
3. **Screenshots** (iPad screenshots required)
4. **Privacy Policy** (for telemetry/data collection)
5. **Code Signing Certificate**

### Steps

1. **Configure in Xcode:**
   - Set bundle identifier
   - Configure signing certificate
   - Set deployment target (iOS 14+)

2. **Create App Icons:**
   ```bash
   npx @capacitor/assets generate --ios
   ```

3. **Archive and Upload:**
   - Product → Archive in Xcode
   - Upload to App Store Connect
   - Submit for review

4. **App Review:**
   - Usually 24-48 hours
   - May request demo account

---

## 🆚 Comparison: iPad vs Desktop vs Web

| Feature | iPad App | Desktop (Electron) | Web Browser |
|---------|----------|-------------------|-------------|
| Distribution | App Store | Direct download | URL |
| Installation | Tap to install | Run installer | None |
| Offline | ✅ Full | ✅ Full | ⚠️ Limited |
| Native feel | ✅ Yes | ✅ Yes | ❌ No |
| Touch-optimized | ✅ Yes | ❌ No | ⚠️ Partial |
| Auto-updates | ✅ App Store | Manual | ✅ Automatic |
| Size | ~90 MB | ~150 MB | N/A |

---

## 🎯 Next Steps

1. **Install Capacitor dependencies**
2. **Create mobile service layer**
3. **Test on iPad Simulator**
4. **Refine UI for touch**
5. **Submit to App Store**

---

## 📚 Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **iOS Guide:** https://capacitorjs.com/docs/ios
- **SQLite Plugin:** https://github.com/capacitor-community/sqlite
- **Apple Developer:** https://developer.apple.com

---

**Estimated Total Development Time: 10-12 weeks**

**Result:** Native iPad app with full offline support, App Store distribution, and 80-85% code reuse from existing web app!
