# ARUS Desktop App - Troubleshooting Guide

## Common Issues and Solutions

### ❌ Error: "spawn ENOENT" when launching app

**Symptom:**
```
Failed to start ARUS server:
spawn /Applications/ARUS Marine Monitoring.app/Contents/Resources/nodejs/bin/node ENOENT

Logs saved to: ~/.arus/logs/server-*.log
```

**Root Cause:**
The DMG installer was built **without** the Node.js runtime. This happens when you run the build script before downloading the Node.js binary.

**Why This Happens:**
The build process requires two steps:
1. Download Node.js runtime to `electron/nodejs/` 
2. Build the DMG (which packages the runtime)

If step 1 is skipped, the DMG won't include Node.js and the app cannot start.

**Solution:**

1. **Download Node.js runtime first:**

```bash
# For Intel Macs
./scripts/download-node-binary.sh

# For Apple Silicon (M1/M2/M3)
./scripts/download-node-arm64.sh
```

2. **Rebuild the DMG:**

```bash
# For Intel Macs
./build-desktop-macos-bundled.sh

# For Apple Silicon  
./build-desktop-macos-arm64.sh

# For both architectures (universal)
./build-desktop-macos-universal.sh
```

3. **Verify the new DMG:**

```bash
# Check the installer was created
ls -lh dist/installers/*.dmg

# Should see file ~180-200 MB in size
```

4. **Reinstall:**
   - Delete old ARUS app from Applications folder
   - Open new DMG from `dist/installers/`
   - Drag to Applications
   - Launch and verify it works

**Prevention:**

The build scripts now include verification checks that will **exit with an error** if the Node.js binary is missing, preventing this issue in future builds.

---

### ❌ Error: Port 5000 already in use

**Symptom:**
```
Port 5000 is already being used by another application.

Common causes:
• AirPlay Receiver
• Development servers
• Another ARUS instance

[Quit] [Try Anyway]
```

**Root Cause:**
Another application is using port 5000.

**Solutions:**

**Option 1: Disable AirPlay Receiver (most common)**
```
macOS Settings → General → AirDrop & Handoff
Turn OFF "AirPlay Receiver"
```

**Option 2: Stop other applications**
- Close development servers
- Check for other ARUS instances
- Restart your Mac (if unsure)

**Option 3: Click "Try Anyway"**
- The app will attempt to start anyway
- May work if the port becomes available
- Not recommended if port is truly occupied

---

### ❌ Error: Permission denied for port 5000

**Symptom:**
```
Permission denied for port 5000. 
Try a different port or run with elevated privileges.
```

**Root Cause:**
Ports below 1024 require admin privileges on macOS. Port 5000 should not have this issue unless system security settings are very strict.

**Solution:**

1. **Check system security settings:**
   - System Preferences → Security & Privacy
   - Ensure ARUS has necessary permissions

2. **Restart the app:**
   - Quit ARUS completely
   - Launch again
   - Right-click → Open (first time)

3. **If persists, contact support:**
   - This is unusual for port 5000
   - May indicate system configuration issue

---

### ❌ Error: Health check timeout

**Symptom:**
```
ARUS server did not start in time.
Please try restarting the application.
```

**Root Cause:**
The server took longer than 30 seconds to start, or crashed during startup.

**Solutions:**

1. **Check the logs:**
```bash
# Open log directory
open ~/.arus/logs/

# View most recent log
tail -100 ~/.arus/logs/server-*.log
```

2. **Common causes:**
   - Database initialization failed
   - Port conflict (check port 5000)
   - Corrupted data directory
   - Insufficient disk space

3. **Reset app data:**
```bash
# Backup first (if needed)
mv ~/Library/Application\ Support/ARUS ~/Desktop/ARUS-backup

# Remove log files
rm -rf ~/.arus/

# Launch app again
```

---

### ❌ App icon shows generic Electron logo

**Symptom:**
The app icon in Applications folder and DMG shows a generic Electron icon instead of ARUS branding.

**Root Cause:**
Custom icon assets need to be created at higher resolution.

**Status:**
This is a **cosmetic issue only** - the app functions perfectly.

**Solution:**

See `docs/ICON_REQUIREMENTS.md` for instructions on creating custom icons.

For production deployment:
1. Create 1024x1024 PNG icon
2. Save to `electron/build/icon.png`
3. Rebuild DMG

---

### ⚠️ App won't open (Gatekeeper blocking)

**Symptom:**
macOS shows: "ARUS cannot be opened because the developer cannot be verified"

**Root Cause:**
The app is unsigned (not code-signed by Apple Developer Program).

**Solution:**

**First Launch:**
1. Right-click on ARUS app
2. Select "Open"
3. Click "Open" in the dialog
4. App will launch

**Subsequent Launches:**
- Double-click works normally
- Only need right-click → Open the first time

**Alternative:**
```bash
# Disable Gatekeeper for this app
xattr -cr /Applications/ARUS\ Marine\ Monitoring.app
```

---

### ⚠️ App won't start on older macOS

**Symptom:**
App quits immediately on launch (macOS 10.12 or older)

**Minimum Requirements:**
- macOS 10.13 High Sierra or later
- For Apple Silicon: macOS 11.0 Big Sur or later

**Solution:**
Upgrade macOS to at least 10.13, or use a newer Mac.

---

### 🔍 Viewing Logs

**Log Location:**
```
~/.arus/logs/server-*.log
```

**View logs:**
```bash
# Open log directory in Finder
open ~/.arus/logs/

# View most recent log
ls -lt ~/.arus/logs/ | head -5

# Read specific log
cat ~/.arus/logs/server-1234567890.log

# Monitor logs in real-time (while app running)
tail -f ~/.arus/logs/server-*.log
```

**Log Rotation:**
- Maximum 20 log files kept
- Older logs automatically deleted
- Each log file ~1-5 MB

---

### 🔧 Complete Reset

If all else fails, completely reset the app:

```bash
# 1. Quit ARUS completely
# 2. Remove app data
rm -rf ~/Library/Application\ Support/ARUS
rm -rf ~/.arus/

# 3. Remove app
rm -rf /Applications/ARUS\ Marine\ Monitoring.app

# 4. Reinstall from DMG
```

---

### 📞 Getting Help

If you encounter issues not covered here:

1. **Check logs:**
   - `~/.arus/logs/server-*.log`
   - Look for error messages

2. **Gather information:**
   - macOS version: `sw_vers`
   - App version: Check "About" in app menu
   - Error screenshots

3. **Common diagnostics:**
```bash
# Check Node.js runtime
ls -lh /Applications/ARUS\ Marine\ Monitoring.app/Contents/Resources/nodejs/bin/node

# Check app structure
ls -R /Applications/ARUS\ Marine\ Monitoring.app/Contents/Resources/ | head -50

# Check permissions
ls -la ~/Library/Application\ Support/ARUS/
```

---

## Build Verification Checklist

Before building DMG for distribution:

- [ ] Node.js runtime downloaded (`electron/nodejs/bin/node` exists)
- [ ] Runtime is correct architecture (Intel vs ARM64)
- [ ] Binary is executable (`-rwxr-xr-x`)
- [ ] Runtime size ~165M (complete installation)
- [ ] Backend code built (`dist/index.js` exists)
- [ ] Frontend built (`dist/client` exists)
- [ ] Icon configured (optional but recommended)

**Build command will now EXIT with error if Node.js runtime is missing!**

---

## Architecture-Specific Notes

### Intel (x86_64) Build

```bash
# Download Intel runtime
./scripts/download-node-binary.sh

# Build Intel DMG
./build-desktop-macos-bundled.sh

# Runs on:
✅ Intel Macs
✅ Apple Silicon Macs (via Rosetta 2)
```

### ARM64 (Apple Silicon) Build

```bash
# Download ARM64 runtime  
./scripts/download-node-arm64.sh

# Build ARM64 DMG
./build-desktop-macos-arm64.sh

# Runs on:
✅ Apple Silicon Macs (M1/M2/M3) - NATIVE
❌ Intel Macs (not compatible)
```

**Performance:**
- ARM64 native: 2-4 second startup (~30% faster)
- Intel on ARM (Rosetta): 4-6 second startup
- Intel on Intel: 3-5 second startup

---

## Quick Reference

| Issue | Command |
|-------|---------|
| Download Intel Node.js | `./scripts/download-node-binary.sh` |
| Download ARM64 Node.js | `./scripts/download-node-arm64.sh` |
| Build Intel DMG | `./build-desktop-macos-bundled.sh` |
| Build ARM64 DMG | `./build-desktop-macos-arm64.sh` |
| Build both | `./build-desktop-macos-universal.sh` |
| View logs | `open ~/.arus/logs/` |
| Reset app data | `rm -rf ~/Library/Application\ Support/ARUS ~/.arus/` |
| Check Node.js | `ls -lh electron/nodejs/bin/node` |

---

**Most common issue: Building DMG before downloading Node.js runtime!**

**Always download Node.js BEFORE building the DMG.**
