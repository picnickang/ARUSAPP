# Building ARUS Desktop Installers

Quick guide to building desktop installers for Windows, macOS, and Linux.

---

## 🚀 Quick Start

### macOS (.dmg)

**On a Mac, run:**
```bash
./build-desktop-macos.sh
```

**Output:** `dist/installers/ARUS-1.0.0.dmg`

---

### Windows (.exe)

**On a Windows machine, run:**

**Option 1: Using Bash (Git Bash, WSL)**
```bash
./build-desktop-windows.sh
```

**Option 2: Using Command Prompt**
```batch
build-desktop-windows.bat
```

**Output:** 
- `dist/installers/ARUS-Setup-1.0.0.exe` (Installer)
- `dist/installers/ARUS-1.0.0.exe` (Portable)

---

### Linux (.AppImage)

**On a Linux machine, run:**
```bash
./build-desktop-app.sh
```

**Output:** `dist/installers/electron/ARUS Marine Monitoring-1.0.0.AppImage`

---

## 📋 What Each Script Does

All scripts automatically:
1. ✅ Build the application (`npm run build`)
2. ✅ Create a clean package.json with electron in `devDependencies`
3. ✅ Install dependencies in isolated environment
4. ✅ Build platform-specific installer
5. ✅ Move installer to `dist/installers/`
6. ✅ Clean up temporary files

**No manual package.json editing required!**

---

## 🎯 Installer Types

### Windows

1. **ARUS-Setup-1.0.0.exe** - NSIS Installer
   - Traditional Windows installer
   - Adds to Start Menu
   - Creates uninstaller
   - ~90 MB

2. **ARUS-1.0.0.exe** - Portable
   - No installation needed
   - Just run the .exe
   - ~100 MB

### macOS

1. **ARUS-1.0.0.dmg** - Disk Image
   - Standard macOS installer
   - Drag to Applications
   - ~95 MB

### Linux

1. **ARUS Marine Monitoring-1.0.0.AppImage** - Portable
   - No installation needed
   - Works on all distributions
   - ~160 MB

---

## 🔧 Requirements

### For Building

- **Node.js** installed
- **npm** installed
- Correct platform for target OS (or use CI)

### For Cross-Platform Building

To build all platforms from one machine, use:
- **GitHub Actions**
- **Electron Forge with remote building**
- **Cloud CI services**

---

## 📦 Distribution

### Single Vessel

Copy the installer to the vessel and run:

**Windows:**
```batch
ARUS-Setup-1.0.0.exe
```

**macOS:**
```bash
open ARUS-1.0.0.dmg
# Drag to Applications
```

**Linux:**
```bash
chmod +x "ARUS Marine Monitoring-1.0.0.AppImage"
./"ARUS Marine Monitoring-1.0.0.AppImage"
```

### Fleet Deployment

Use your deployment tool:

**Windows (Group Policy):**
```batch
msiexec /i ARUS-Setup.exe /quiet
```

**macOS (Jamf):**
```bash
sudo installer -pkg ARUS.pkg -target /
```

**Linux (Ansible):**
```bash
ansible-playbook -i inventory deploy-arus-desktop.yml
```

---

## 🐛 Troubleshooting

### "electron must be in devDependencies" Error

**Solution:** Use the provided build scripts - they handle this automatically.

### Missing dependencies

**Solution:**
```bash
npm install
npm run build
```

### Build fails on wrong platform

**Windows .exe** requires Windows (or CI)
**macOS .dmg** requires macOS (or CI)
**Linux .AppImage** can be built on any Linux

---

## 📊 Build Times

| Platform | Build Time | Output Size |
|----------|-----------|-------------|
| Windows | 3-5 min | 90-100 MB |
| macOS | 3-5 min | 95 MB |
| Linux | 2-3 min | 160 MB |

---

## ✅ Success Checklist

After building, verify:
- [ ] Installer file exists in `dist/installers/`
- [ ] File size is reasonable (~90-160 MB)
- [ ] Installer runs and opens the app
- [ ] App connects to database
- [ ] System tray icon appears

---

## 🔐 Code Signing (Production)

For production distribution, sign your installers:

**Windows:**
```bash
signtool sign /f cert.pfx /p password ARUS-Setup.exe
```

**macOS:**
```bash
codesign --deep --force --sign "Developer ID" ARUS.app
xcrun notarytool submit ARUS.dmg --wait
```

---

## 📚 Related Documentation

- **Desktop App Guide:** `docs/DESKTOP_APP_GUIDE.md`
- **Packaging Options:** `docs/PACKAGING_OPTIONS.md`
- **Quick Guide:** `docs/QUICK_PACKAGING_GUIDE.md`

---

**Ready to build?** Pick your platform and run the script! 🚀
