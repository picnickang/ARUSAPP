# 📱 ARUS Marine - iPhone & iPad Installation Guide

Install ARUS Marine as a Progressive Web App (PWA) on your iPhone or iPad. This allows you to use ARUS like a native app with offline capabilities, full-screen experience, and home screen access.

---

## 📋 Prerequisites

- **iOS 16.4 or later** (recommended)
- **Safari browser** (required for installation)
- **Active internet connection** (for initial installation)

---

## 🚀 Installation Steps

### Step 1: Open Safari
1. Launch **Safari** on your iPhone or iPad
2. Navigate to your ARUS installation URL (e.g., `https://your-arus-domain.com`)

### Step 2: Add to Home Screen
1. Tap the **Share button** (square with arrow pointing up) at the bottom of Safari
2. Scroll down and tap **"Add to Home Screen"**
   
   ![Safari Share Button](https://via.placeholder.com/300x100/1e40af/ffffff?text=Tap+Share+Button)

### Step 3: Customize Installation
1. You'll see a preview of the app icon and name
2. **App Name**: "ARUS Marine" (you can rename it if needed)
3. **Icon**: The ARUS logo will appear
4. Tap **"Add"** in the top right corner

### Step 4: Launch the App
1. Find the **ARUS Marine** icon on your home screen
2. Tap to launch
3. The app opens in **full-screen mode** (no Safari UI bars)

---

## ✨ Features When Installed

### 🌐 Offline Functionality
- **View cached data** when offline (dashboard, equipment, work orders)
- **Automatic sync** when connection is restored
- **24-hour data cache** for recent information

### 📲 Native App Experience
- **Full-screen mode** - No browser bars or navigation
- **Home screen icon** - Quick access like a native app
- **Standalone operation** - Runs independently from Safari
- **iOS integration** - Appears in app switcher and multitasking

### 🔔 Push Notifications (Planned Feature)
- **Critical alerts** - Equipment failures, critical DTCs
- **Work order updates** - New assignments, completions
- **System notifications** - Maintenance schedules, crew alerts
- **Note**: Infrastructure ready, full implementation planned

### 💾 Data Persistence
- **Automatic caching** - Dashboard metrics, equipment health (read-only offline)
- **Real-time sync** - Updates when online
- **Local storage** - Persistent cached data across sessions
- **Note**: Background sync for offline edits is planned but not yet implemented

---

## 📱 Supported Devices

| Device | iOS Version | Status |
|--------|-------------|--------|
| iPhone 15 / Pro / Max | iOS 17+ | ✅ Fully Supported |
| iPhone 14 / Pro / Max | iOS 16+ | ✅ Fully Supported |
| iPhone 13 / Pro / Max | iOS 16+ | ✅ Fully Supported |
| iPhone 12 / Pro / Max | iOS 16+ | ✅ Fully Supported |
| iPhone 11 / Pro / Max | iOS 16+ | ✅ Fully Supported |
| iPhone XS / XR / X | iOS 16+ | ✅ Fully Supported |
| iPad Pro (all models) | iPadOS 16+ | ✅ Fully Supported |
| iPad Air (3rd gen+) | iPadOS 16+ | ✅ Fully Supported |
| iPad (8th gen+) | iPadOS 16+ | ✅ Fully Supported |

---

## 🔧 Troubleshooting

### Issue: "Add to Home Screen" option not appearing
**Solution:**
- Make sure you're using **Safari** (not Chrome or other browsers)
- Check that you're on the actual website (not a bookmarked page)
- Clear Safari cache: Settings → Safari → Clear History and Website Data

### Issue: App opens in Safari instead of standalone mode
**Solution:**
- Delete the app from home screen
- Reinstall using the steps above
- Make sure to tap "Add to Home Screen" (not "Add Bookmark")

### Issue: Offline mode not working
**Solution:**
- Open the app at least once while online
- Allow the service worker to cache initial data (~1-2 minutes)
- Check iOS Settings → Safari → Advanced → Website Data (ARUS should be listed)

### Issue: Icon not displaying correctly
**Solution:**
- Delete and reinstall the app
- Clear Safari cache before reinstalling
- Check your internet connection during installation

### Issue: Push notifications not appearing
**Note:**
- Push notifications are a planned feature (infrastructure ready)
- Full implementation coming in future update
- Currently relies on real-time WebSocket updates when app is open

---

## 🔄 Updating the App

The app updates automatically when changes are deployed:

1. **Automatic Updates**: Close and reopen the app to receive updates
2. **Manual Update**: 
   - Open Safari
   - Navigate to the ARUS URL
   - The latest version will load
   - Service worker updates in the background
3. **Force Update**: Delete app, clear Safari cache, reinstall

---

## 📊 App Capabilities

### ✅ Works Offline
- Dashboard metrics (cached)
- Equipment health monitoring (cached)
- Work orders list (cached)
- Fleet overview (cached)
- Recent telemetry data (cached)

### ⚠️ Requires Internet
- Real-time telemetry updates
- AI-powered reports generation
- New work order creation
- Database schema updates
- LLM insights and predictions

---

## 💡 Best Practices

### For Maritime Use:
- **Pre-download data**: Open all critical pages while docked (with internet)
- **Check sync status**: Look for online/offline indicator in the app
- **Regular updates**: Connect to internet daily to sync changes
- **Cache management**: The app auto-manages cache (24-hour retention)

### For Multi-User Teams:
- **Individual installations**: Each crew member installs on their device
- **Shared credentials**: Use the same login across all devices
- **Sync awareness**: Changes sync when connection is available
- **Offline coordination**: Be aware of delayed sync when working offline

---

## 🔒 Security & Privacy

- **Secure Storage**: All cached data is encrypted on your device
- **HTTPS Only**: App requires secure connection for installation
- **Session Management**: Auto-logout on inactivity (configurable)
- **Data Sync**: Changes sync over encrypted connection only

---

## 📞 Support

### Installation Issues
- Check this guide's troubleshooting section
- Ensure iOS 16.4+ and Safari browser
- Clear browser cache and try again

### Feature Requests
- Suggest improvements through the app
- Request additional offline capabilities
- Report PWA-specific issues

### Technical Support
- Report bugs via the app's feedback system
- Contact your system administrator
- Check INSTALL.md for server setup issues

---

## 🎯 Quick Reference

### Installation Summary:
```
1. Open Safari
2. Navigate to ARUS URL
3. Tap Share button
4. Tap "Add to Home Screen"
5. Tap "Add"
6. Launch from home screen
```

### First-Time Setup:
```
1. Install the app (follow steps above)
2. Open app with internet connection
3. Log in with credentials
4. Wait 1-2 minutes for initial cache
5. App is ready for offline use
```

### Daily Use:
```
- Open app from home screen
- Work normally (online or offline)
- Changes sync automatically
- Close app when done
```

---

## 📖 Additional Resources

- **Main Installation Guide**: See `INSTALL.md` for server setup
- **System Architecture**: See `replit.md` for technical details
- **User Documentation**: Available in the app's help section
- **API Documentation**: For developers and integrators

---

## 🌊 Ready to Set Sail!

Your ARUS Marine app is now installed and ready to use at sea or on shore. The offline capabilities ensure you can monitor your fleet and manage maintenance even when connectivity is limited.

**Need help?** Check the troubleshooting section or contact your system administrator.

---

*Last Updated: October 2025*  
*ARUS Marine Predictive Maintenance System*
