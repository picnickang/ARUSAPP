# Desktop App Build Troubleshooting

Common issues and solutions when building the ARUS desktop application.

---

## ❌ Error: "ENAMETOOLONG: name too long"

### Symptom
```
⨯ ENAMETOOLONG: name too long, copyfile '/Users/.../ARUS Marine Monitoring.app/Contents/Resources/dist/electron/mac/ARUS Marine Monitoring.app/Contents/Resources/dist/electron/mac/...
```

### Cause
Electron-builder is creating a recursive directory structure by copying the build output into itself.

### Solution
This is fixed in the latest version. The configuration now:
1. Excludes the `dist/electron` folder from being copied
2. Places server code in `app/dist` to avoid conflicts
3. Properly separates bundled resources from build output

### If You Still See This
```bash
# Clean everything and rebuild
rm -rf macos-build-bundled
rm -rf dist/installers
./build-desktop-macos-bundled.sh
```

---

## ❌ Error: "Cannot find module 'dmg-license'"

### Symptom
```
⨯ Cannot find module 'dmg-license'
```

### Cause
Missing optional dependency for DMG creation on macOS.

### Solution
Already fixed in build script - `dmg-license` is now included in devDependencies.

---

## ❌ Error: Server won't start in packaged app

### Symptom
- App opens but shows blank screen
- No connection to localhost:5000

### Cause
Server path incorrect in packaged app.

### Solution
Check the path configuration in `electron/main.js`:

```javascript
const serverPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'app/dist/index.js')
  : path.join(__dirname, '../dist/index.js');
```

The bundled server should be at `app/dist/index.js` inside the app resources.

---

## ❌ Build works on macOS but installer won't open

### Symptom
- Build succeeds
- DMG file created
- Double-click DMG: "damaged and can't be opened"

### Cause
macOS Gatekeeper blocking unsigned apps.

### Solution

**For Development/Internal Use:**
```bash
# Right-click the .dmg → Open
# Or use command line:
xattr -cr ARUS-1.0.0.dmg
open ARUS-1.0.0.dmg
```

**For Distribution:**
You need to sign the app with an Apple Developer certificate:

```bash
# Sign the app
codesign --deep --force --sign "Developer ID Application: Your Name" \
  dist/installers/mac/ARUS\ Marine\ Monitoring.app

# Notarize for Gatekeeper
xcrun notarytool submit dist/installers/ARUS-1.0.0.dmg \
  --apple-id your@email.com \
  --team-id TEAMID \
  --password app-specific-password \
  --wait
```

---

## ❌ Build succeeds but app is huge (>500MB)

### Symptom
The .app or .dmg file is much larger than expected.

### Cause
TensorFlow or other large dependencies being included.

### Solution
Check `electron-builder.yml` excludes:

```yaml
files:
  - "!node_modules/@tensorflow"
  - "!node_modules/electron"
  - "!node_modules/electron-builder"
```

Expected size: ~95-100 MB

---

## ❌ Database not found after installation

### Symptom
- App opens
- Error: "Cannot connect to database"

### Cause
SQLite database path not properly configured.

### Solution
The app should create the database automatically in:
- **macOS:** `~/Library/Application Support/ARUS/`
- **Windows:** `%APPDATA%/ARUS/`
- **Linux:** `~/.config/ARUS/`

Check environment variables are set:
```javascript
process.env.LOCAL_MODE = 'true';
```

---

## ❌ Can't build macOS .dmg on Linux

### Symptom
```
Cannot find module 'dmg-license'
```

### Cause
DMG files can only be built on macOS.

### Solution
Use GitHub Actions or build on a Mac:

```bash
# On macOS:
./build-desktop-macos-bundled.sh

# Or use GitHub Actions (automatic):
git push origin main
# Download from GitHub Actions artifacts
```

See `docs/BUILD_ALL_PLATFORMS.md` for cross-platform build strategies.

---

## ❌ "The application cannot be opened" on first launch

### Symptom
macOS shows security warning on first launch.

### Cause
App is not signed or notarized.

### Solution

**Quick Fix (Development):**
```bash
# Right-click app → Open (instead of double-click)
# Or:
xattr -cr /Applications/ARUS\ Marine\ Monitoring.app
open /Applications/ARUS\ Marine\ Monitoring.app
```

**Permanent Fix (Distribution):**
Sign and notarize the app (requires Apple Developer account - $99/year).

---

## ❌ Build fails with "Out of memory"

### Symptom
```
JavaScript heap out of memory
```

### Cause
electron-builder running out of memory during packaging.

### Solution
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max_old_space_size=4096 ./build-desktop-macos-bundled.sh
```

---

## 🔍 Debug Mode

To see detailed build output:

```bash
# Set debug environment variable
DEBUG=electron-builder ./build-desktop-macos-bundled.sh
```

---

## 📝 Verify Build is Correct

After building, check:

```bash
# List contents of the app
ls -R "dist/installers/mac/ARUS Marine Monitoring.app/Contents/Resources/"

# Should see:
# - app/dist/index.js (server)
# - electron/main.js
# - electron/preload.js
# - electron/icon.png
```

---

## 🆘 Still Having Issues?

1. **Clean everything:**
   ```bash
   rm -rf macos-build-bundled
   rm -rf dist/installers
   rm -rf node_modules
   npm install
   npm run build
   ./build-desktop-macos-bundled.sh
   ```

2. **Check prerequisites:**
   - macOS 10.13 or higher
   - Xcode Command Line Tools installed
   - Node.js 18 or higher
   - Sufficient disk space (~2GB)

3. **Test in development mode first:**
   ```bash
   npm run build
   node electron-start.js
   ```

If it works in dev but not in packaged app, it's a path or resource issue.

---

**Most Common Fix:** Delete `macos-build-bundled` folder and rebuild from scratch!
