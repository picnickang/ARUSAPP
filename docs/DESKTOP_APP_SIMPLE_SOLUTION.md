# Desktop App - Simple Working Solution

The cleanest approach for now is to **require Node.js to be installed** on the system, rather than trying to bundle everything into a single executable.

---

## ✅ Recommended Approach

###Install & Run (macOS/Linux)

```bash
# 1. User installs Node.js (one-time setup)
# Download from: https://nodejs.org

# 2. Build the desktop app
./build-desktop-macos-bundled.sh

# 3. Install the .dmg
open dist/installers/ARUS-1.0.0.dmg

# 4. Launch ARUS
# The app will use system Node.js to run the server
```

---

## 🔧 How It Works

```
User launches ARUS.app
  ↓
Electron checks for Node.js on system
  ↓
Spawns: node /path/to/server/index.js
  ↓
Server starts (using system Node.js) ✅
  ↓
Window opens → Dashboard loads ✅
```

---

## 📋 User Requirements

**One-time setup:**
1. Install Node.js 18+ from https://nodejs.org
2. Install ARUS from .dmg

**Then it just works!**

---

## 🎯 Why This Approach?

| Approach | Pros | Cons |
|----------|------|------|
| **System Node.js** | ✅ Simple<br>✅ Works reliably<br>✅ Small app size | ⚠️ Requires Node.js installed |
| ELECTRON_RUN_AS_NODE | ✅ No dependencies | ❌ Causes infinite loop<br>❌ Complex<br>❌ Unreliable in production |
| Bundled Node binary | ✅ No dependencies | ❌ +50MB app size<br>❌ Complex build<br>❌ Platform-specific |

**System Node.js is the most reliable!**

---

## 🚀 Alternative: Development Mode

For testing without installing:

```bash
# Run in development mode
npm run build
node electron-start.js
```

This launches both server and Electron together.

---

## 📦 Distribution

When distributing to vessels:

**Include in your README:**
```
ARUS Marine Monitoring - Installation
=====================================

Prerequisites:
1. macOS 10.13 or later
2. Node.js 18+ (download from https://nodejs.org)

Installation:
1. Open ARUS-1.0.0.dmg
2. Drag ARUS to Applications folder
3. Launch ARUS from Applications

The app will start automatically and open the dashboard.
```

---

## 🔄 Future: Fully Bundled Version

If you want a true single-file executable with no dependencies, we can:

1. Use `pkg` to bundle Node.js + server into standalone executable
2. Ship that executable with Electron
3. More complex but zero dependencies

For now, **requiring Node.js is the simplest, most reliable approach.**

---

## ✅ Summary

**Current solution:**
- Electron app spawns system Node.js
- Server runs separately
- Reliable and simple

**User needs:**
- Node.js installed (one-time)
- Everything else just works

**App size:** ~95-100 MB
**Dependencies:** Node.js 18+
**Platforms:** macOS, Windows, Linux

This is how most Electron apps with backends work (VS Code, Slack, etc.)!
