# Building for All Platforms from macOS

Since you're on macOS, here are the best ways to build Windows .exe files.

---

## ✅ Option 1: GitHub Actions (FREE & Automatic)

**Best option - builds all platforms in the cloud!**

### Setup

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add desktop app support"
   git push origin main
   ```

2. **GitHub automatically builds:**
   - Windows .exe files
   - macOS .dmg files
   - Linux .AppImage files

3. **Download installers:**
   - Go to GitHub Actions tab
   - Click on the latest build
   - Download artifacts (all installers)

### Configuration

The workflow file is already created: `.github/workflows/build-desktop.yml`

It runs automatically on every push to `main` branch, or you can trigger it manually from GitHub Actions tab.

---

## ✅ Option 2: Use a Windows Machine/VM

### Windows Machine
Simply run:
```bash
./build-desktop-windows.sh
# or
build-desktop-windows.bat
```

### Windows VM
1. Install Windows in Parallels/VMware/VirtualBox
2. Share the project folder
3. Run build script in Windows

---

## ✅ Option 3: Cloud Build Service

### Electron Forge with Cloud Build

```bash
npm install -g @electron-forge/cli
electron-forge import
electron-forge publish
```

Uses cloud services to build all platforms.

---

## ❌ Option 4: Wine (Not Recommended)

You *can* use Wine on macOS, but:
- Complex setup
- Unreliable results
- Often produces broken executables
- Not worth the hassle

If you really want to try:

```bash
# Install Wine via Homebrew
brew install --cask wine-stable

# Install Windows dependencies
brew install mono

# Try to build (may fail)
npx electron-builder --win --x64
```

**Problems with Wine approach:**
- Code signing won't work
- Installers may be corrupted
- No guarantee of success
- macOS security blocks Wine apps

---

## 🎯 Recommended Workflow

**For professional distribution:**

```bash
# On your Mac - build macOS
./build-desktop-macos.sh

# On GitHub Actions - build everything else
git push origin main
# Wait 5-10 minutes
# Download Windows .exe from GitHub Actions artifacts

# Or borrow a Windows PC for 5 minutes
# Copy project folder
# Run: build-desktop-windows.bat
```

---

## 📦 What Each Platform Produces

| Platform | Built On | Output |
|----------|----------|--------|
| **macOS** .dmg | Mac | ✅ `ARUS-1.0.0.dmg` |
| **Windows** .exe | Windows or GitHub | `ARUS-Setup-1.0.0.exe` |
| **Linux** .AppImage | Linux or GitHub | `ARUS-1.0.0.AppImage` |

---

## 🚀 Quick Start with GitHub Actions

1. **Create GitHub repo** (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/arus.git
   git push -u origin main
   ```

2. **Watch the magic:**
   - Go to: https://github.com/yourusername/arus/actions
   - See builds running for Windows, macOS, Linux
   - Download all installers in 10 minutes

3. **Done!** You have installers for all platforms built from your Mac.

---

## 💡 Pro Tip

**Don't waste time with Wine.** Either:
- Use GitHub Actions (free, easy, reliable)
- Use a Windows machine for 5 minutes
- Use a cloud Windows VM

Building native Windows apps requires Windows - trying to work around this on macOS usually creates more problems than it solves.

---

## Summary

| Method | Cost | Reliability | Setup Time |
|--------|------|-------------|------------|
| GitHub Actions | FREE | ⭐⭐⭐⭐⭐ | 5 min |
| Windows PC/VM | FREE | ⭐⭐⭐⭐⭐ | 10 min |
| Cloud Build | $$ | ⭐⭐⭐⭐ | 30 min |
| Wine on macOS | FREE | ⭐ | 2 hours + headaches |

**Recommendation: Use GitHub Actions** - it's free, reliable, and builds everything automatically!
