# ARUS Desktop App - Known Issues & Platform Notes

## macOS Platform-Specific Information

### Apple Silicon (M1/M2/M3) Compatibility

**Current Status:** ✅ Works via Rosetta 2

The bundled Node.js runtime is compiled for Intel (x64) architecture. On Apple Silicon Macs (M1, M2, M3), the app will automatically run through Rosetta 2 translation.

**Performance Impact:**
- First launch: +1-2 seconds (Rosetta translation)
- Subsequent launches: Minimal impact
- Runtime performance: ~5-10% slower than native ARM64

**To Check if You're Using Rosetta:**
```bash
# Open Activity Monitor
# Find "ARUS Marine Monitoring"
# Look for "Kind" column:
#   - "Intel" = Running via Rosetta
#   - "Apple" = Native (not yet available)
```

**Future Enhancement:**
We plan to add native ARM64 builds in a future release for optimal performance on Apple Silicon.

---

## Common Issues & Solutions

### 1. Port 5000 Already in Use

**Symptoms:**
- Error dialog: "Port 5000 is already being used"
- App won't start

**Causes:**
- Another instance of ARUS is running
- Development server (Vite, React, Flask) using port 5000
- AirPlay Receiver enabled (macOS Monterey+)

**Solutions:**

**Option A: Disable AirPlay Receiver**
```
System Preferences → Sharing → Uncheck "AirPlay Receiver"
```

**Option B: Kill Process Using Port 5000**
```bash
lsof -ti:5000 | xargs kill -9
```

**Option C: Find What's Using the Port**
```bash
lsof -i :5000
# Shows which application is using port 5000
```

---

### 2. "Cannot be opened because the developer cannot be verified"

**Symptoms:**
- macOS Gatekeeper blocks the app
- Double-clicking doesn't open the app

**Solution:**
```
1. Right-click (or Control-click) on ARUS.app
2. Select "Open" from the menu
3. Click "Open" in the dialog
4. Future launches will work normally
```

**Why This Happens:**
ARUS is not currently code-signed with an Apple Developer Certificate.

---

### 3. Server Crashes or Won't Start

**Symptoms:**
- "Server Crashed" error dialog
- App quits immediately after launch

**Diagnostic Steps:**

**Check Logs:**
```bash
# Logs are automatically saved to:
~//.arus/logs/

# View most recent log:
ls -lt ~/.arus/logs/ | head -2
cat ~/.arus/logs/server-[timestamp].log
```

**Common Causes:**
1. **SQLite database locked** - Another process has the database open
2. **Insufficient disk space** - Database needs space to grow
3. **Permissions issue** - Can't write to application data directory

**Solutions:**
1. Restart your Mac (clears locked files)
2. Free up disk space (need at least 1GB free)
3. Check permissions on `~/Library/Application Support/ARUS/`

---

### 4. Blank Window / Dashboard Won't Load

**Symptoms:**
- App opens but shows blank white screen
- Loading spinner forever

**Diagnostic Steps:**

**Check Server Logs:**
```bash
tail -f ~/.arus/logs/server-*.log
```

**Open Developer Console:**
```
1. With ARUS window focused
2. Press Cmd+Option+I
3. Check Console tab for errors
```

**Common Causes:**
- Server is starting but slow to respond
- Health check timeout too short
- Database migration taking time

**Solutions:**
1. Wait 30-60 seconds (first launch is slower)
2. Restart via tray menu: "Restart Application"
3. Check server logs for specific errors

---

### 5. Database Issues

**Symptoms:**
- "Database error" messages
- Data not persisting
- Can't create vessels/equipment

**Locations:**
```bash
# Database file:
~/Library/Application Support/ARUS/vessel.db

# Backup database:
cp ~/Library/Application\ Support/ARUS/vessel.db ~/Desktop/arus-backup.db

# Reset database (WARNING: deletes all data):
rm ~/Library/Application\ Support/ARUS/vessel.db
# Restart ARUS - fresh database will be created
```

---

## Debugging Tips

### View All Logs

```bash
# Server logs
ls -lh ~/.arus/logs/

# Application data
ls -lh ~/Library/Application\ Support/ARUS/

# View recent server log
tail -100 $(ls -t ~/.arus/logs/server-*.log | head -1)
```

### Manual Server Testing

```bash
# Find Node.js binary in app bundle
cd /Applications/ARUS\ Marine\ Monitoring.app/Contents/Resources/

# Test Node.js works
./nodejs/bin/node --version
# Should show: v20.11.0

# Test server starts
LOCAL_MODE=true ./nodejs/bin/node app/dist/index.js
# Should start on port 5000
```

### Network Connectivity

```bash
# Test if server is running
curl http://localhost:5000

# Should return HTML (dashboard)
```

---

## Performance Optimization

### First Launch
- **Expected:** 5-10 seconds
- **Includes:** Database creation, initial sync, health checks

### Subsequent Launches
- **Expected:** 2-4 seconds
- **Faster:** Database already exists, no migration needed

### Memory Usage
- **Normal:** 250-400 MB
- **With heavy data:** 500-800 MB
- **Peak during sync:** 1-1.5 GB

### Disk Usage
- **App:** ~180-200 MB
- **Database:** 10-500 MB (varies by usage)
- **Logs:** 1-10 MB
- **Total:** ~200-700 MB

---

## Limitations

### Current Version (1.0.0)

1. **No Auto-Update** - Manual download/install required for updates
2. **Intel-Only** - Runs via Rosetta on Apple Silicon
3. **macOS 10.13+** - Older versions not supported
4. **Port 5000 Fixed** - Cannot change port without rebuilding
5. **Single Instance** - Can't run multiple ARUS instances

---

## Reporting Issues

If you encounter issues not covered here:

1. **Collect Logs:**
   ```bash
   tar -czf arus-logs.tar.gz ~/.arus/logs/
   ```

2. **Include System Info:**
   ```bash
   sw_vers  # macOS version
   sysctl -n machdep.cpu.brand_string  # CPU
   system_profiler SPHardwareDataType | grep Memory  # RAM
   ```

3. **Describe Issue:**
   - What were you doing when it failed?
   - Error messages shown
   - When did it start happening?

4. **Send to:** support@arus-marine.com

---

## Future Enhancements

Planned for future releases:

- ✅ Native ARM64 build for Apple Silicon
- ✅ Auto-update system
- ✅ Configurable port
- ✅ Multi-instance support
- ✅ Code signing for easier installation
- ✅ Windows and Linux versions

---

**Last Updated:** October 19, 2025  
**App Version:** 1.0.0  
**Node.js Version:** 20.11.0 (Intel x64)
