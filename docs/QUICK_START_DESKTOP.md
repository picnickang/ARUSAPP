# ARUS Desktop App - Quick Start Guide

## Installation

### Download

Download `ARUS-1.0.0.dmg` from the distribution server or USB drive.

### Install

1. **Open the DMG file**
   - Double-click `ARUS-1.0.0.dmg`
   - A window will open showing the ARUS app

2. **Drag to Applications**
   - Drag `ARUS Marine Monitoring` to the Applications folder
   - Wait for copy to complete (~30 seconds for 180-200 MB)

3. **First Launch (Important!)**
   - **Right-click** on the app in Applications
   - Select **"Open"** from the menu
   - Click **"Open"** in the security dialog
   
   > ⚠️ **Why right-click?** macOS Gatekeeper blocks unsigned apps. Right-click → Open bypasses this check.

4. **Wait for Dashboard**
   - App will take 5-10 seconds to start first time
   - Window appears automatically when ready
   - Dashboard loads - you're ready to go!

---

## Troubleshooting

### Port 5000 Error

**Error:** "Port 5000 is already being used"

**Solution:**
1. Close any other ARUS instances
2. Disable AirPlay Receiver:
   - System Preferences → Sharing
   - Uncheck "AirPlay Receiver"
3. Restart ARUS

### App Won't Open

**Error:** "Cannot be opened because the developer cannot be verified"

**Solution:**
1. **Right-click** on the app
2. Select **"Open"**
3. Click **"Open"** in dialog
4. Future launches will work normally

### Blank Window

**If window opens but dashboard doesn't load:**

1. Wait 30 seconds (first launch is slower)
2. Check logs:
   ```bash
   cat ~/.arus/logs/server-*.log
   ```
3. Restart via tray menu: Right-click tray icon → "Restart Application"

---

## Daily Use

### Starting ARUS

Just double-click the app in Applications - it will:
1. Start the server (2-4 seconds)
2. Open the dashboard automatically
3. Load your vessel data

### Using the Tray Icon

Look for the ARUS icon in the menu bar (top-right).

**Right-click for menu:**
- Show Dashboard
- Open in Browser
- Restart Server
- Restart Application
- Quit

### Closing ARUS

Three options:

1. **Close window** - App stays running in background (tray)
2. **Tray → Quit** - Completely quit the app
3. **Cmd+Q** - Quit from keyboard

---

## System Tray

The ARUS icon in your menu bar provides quick access:

- **Double-click** → Show dashboard
- **Right-click** → Show menu

Even if you close the window, the server keeps running in the background!

---

## Logs

Server logs are saved to:
```
~/.arus/logs/server-[timestamp].log
```

**View recent logs:**
```bash
tail -f ~/.arus/logs/server-*.log
```

---

## Uninstall

1. Quit ARUS (Tray → Quit)
2. Delete from Applications:
   ```bash
   rm -rf /Applications/ARUS\ Marine\ Monitoring.app
   ```
3. (Optional) Remove data:
   ```bash
   rm -rf ~/.arus
   rm -rf ~/Library/Application\ Support/ARUS
   ```

---

## Support

**Logs Location:** `~/.arus/logs/`  
**Database Location:** `~/Library/Application Support/ARUS/vessel.db`  
**Support Email:** support@arus-marine.com

**When reporting issues, include:**
1. Recent log file from `~/.arus/logs/`
2. macOS version (System Preferences → About This Mac)
3. Error message screenshot
