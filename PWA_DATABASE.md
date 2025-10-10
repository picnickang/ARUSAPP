# 🔄 PWA & Shared Database Architecture

This document explains how ARUS Marine's Progressive Web App (PWA) works with a shared PostgreSQL database across multiple devices and users.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared PostgreSQL Database                │
│  (Single source of truth for all users and devices)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─── Express API Server ───┐
                       │                           │
          ┌────────────┴────────────┐    ┌────────┴─────────────┐
          │                         │    │                      │
    ┌─────▼─────┐             ┌────▼────┐              ┌───────▼────┐
    │  iPhone   │             │ Android │              │   Desktop  │
    │    PWA    │             │   PWA   │              │    PWA     │
    └───────────┘             └─────────┘              └────────────┘
          │                         │                        │
    ┌─────▼─────┐             ┌────▼────┐              ┌───────▼────┐
    │Local Cache│             │Local    │              │Local Cache │
    │(IndexedDB)│             │Cache    │              │(IndexedDB) │
    └───────────┘             └─────────┘              └────────────┘
```

---

## ✅ How It Works

### **Online Mode** (Normal Operation)
1. User opens ARUS Marine PWA on their device
2. PWA makes API requests to Express server
3. Express server queries PostgreSQL database
4. Data returned to PWA and displayed
5. **Simultaneously**: Service worker caches response for offline use
6. All users see the same data from shared database

### **Offline Mode** (No Internet Connection)
1. User opens ARUS Marine PWA (works even offline!)
2. PWA cannot reach API server
3. Service worker intercepts failed requests
4. Cached data served from local browser storage
5. User can view equipment health, work orders, dashboard (read-only)
6. **Data modifications require internet connection** (offline edits not yet supported)

### **Reconnection** (Back Online)
1. PWA detects internet connection restored
2. Fresh data automatically downloaded from API server
3. Cache updated with latest information
4. User sees current data across all devices
5. WebSocket reconnects for real-time updates
6. **Note**: Background sync for offline edits is planned but not yet implemented

### **Future: Conflict Resolution** (When Background Sync Implemented)
When multiple devices sync offline changes, conflicts will be resolved using:
- **Optimistic locking** - Version numbers detect conflicts
- **Field-level merging** - Non-conflicting changes merged automatically
- **Automatic rules** - Safety-critical fields require manual resolution
- **User resolution UI** - Present conflicts for user decision

📋 **See `CONFLICT_RESOLUTION.md` for complete strategy**

---

## 🔐 Shared Database Benefits

### ✅ **Single Source of Truth**
- All crew members access the same PostgreSQL database
- Equipment updates visible to entire team instantly
- Work orders synchronized across all devices
- No data conflicts or duplication

### ✅ **Multi-User Collaboration**
- Captain on bridge using desktop PWA
- Engineer in engine room using tablet PWA
- Crew members using iPhone/Android PWAs
- All connected to same shared database

### ✅ **Per-Device Caching**
- Each device has its own local cache
- Cache doesn't interfere with database
- Offline access without affecting other users
- Automatic cache refresh when online

---

## 📊 Data Flow Examples

### Example 1: Equipment Health Update

**Scenario**: Engineer updates engine temperature threshold

```
1. Engineer (Android PWA) → Makes change
2. API Request → PostgreSQL database updated
3. WebSocket broadcast → All connected devices notified
4. Captain's desktop PWA → Sees update in real-time
5. Service workers → Update cache on all devices
6. Offline crew member → Gets update when reconnected
```

### Example 2: Work Order Creation

**Scenario**: Captain creates work order while at sea (intermittent connection)

```
1. Captain (iPhone PWA) → Creates work order (requires internet)
2. If offline → Work order creation deferred until online
3. Internet available → API Request → PostgreSQL database updated
4. Engineer's tablet → Receives new work order via real-time updates
5. All devices → Cache refreshed with latest data

Note: Background sync for offline work order creation is planned but not yet implemented.
```

### Example 3: Telemetry Monitoring

**Scenario**: Multiple crew monitoring engine telemetry

```
1. Sensors → Send data to API server
2. API Server → Stores in PostgreSQL
3. WebSocket → Broadcasts to all connected PWAs
4. All devices → Update charts in real-time
5. Service workers → Cache latest telemetry
6. Offline viewers → See last cached values
```

---

## 🔄 Sync Strategies

### **Cache-First Strategy** (Static Assets)
```
Request → Check Cache → If found: return cached
                      → If not found: fetch from network + cache
```
**Used for**: App shell, images, CSS, JavaScript

### **Network-First Strategy** (API Data)
```
Request → Try network → If success: return + update cache
                      → If fail: return cached (if available)
```
**Used for**: Equipment data, work orders, telemetry

### **Stale-While-Revalidate** (Dashboard)
```
Request → Return cached immediately
        → Fetch fresh data in background
        → Update cache + UI when received
```
**Used for**: Dashboard metrics, fleet overview

---

## 💾 Storage Breakdown

### **PostgreSQL Database** (Server-Side)
- **Location**: Cloud or on-premise server
- **Shared by**: All users and devices
- **Contains**: Complete authoritative data
- **Size**: Unlimited (server capacity)
- **Persistence**: Permanent

### **IndexedDB Cache** (Client-Side)
- **Location**: Each device's browser storage
- **Shared by**: Only that specific device
- **Contains**: Cached copies of recent data
- **Size**: ~50-100 MB per device (browser dependent)
- **Persistence**: 24 hours (configurable)

---

## ⚙️ Configuration

### Cache Duration (Modify in `service-worker.js`)
```javascript
// Current: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// For longer offshore periods:
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Cached Endpoints
```javascript
// Currently cached for offline access:
- /api/dashboard
- /api/equipment/health
- /api/work-orders
- /api/fleet/overview
- /api/telemetry/latest
- /api/dtc/dashboard-stats
```

### Background Sync (Planned Feature)
```javascript
// Event listeners configured, implementation planned for:
- Work order creation/updates
- Alert acknowledgments  
- Equipment status changes

// Current status: Scaffolded but not yet fully implemented
// Users should perform updates while online until fully implemented
```

---

## 🔒 Security Considerations

### **Authentication**
- Session tokens stored securely
- HTTPS required for PWA installation
- Tokens encrypted in browser storage
- Auto-logout on inactivity

### **Data Privacy**
- Each user's cache isolated
- No cross-user data leakage
- Cache cleared on logout
- Encrypted transmission (HTTPS/WSS)

### **Access Control**
- Database permissions enforced server-side
- API validates all requests
- PWA respects user permissions
- Read-only offline access for safety

---

## 🚢 Maritime Use Cases

### **Scenario 1: Coastal Operations**
- **Internet**: Intermittent 4G/5G
- **Strategy**: Network-first with cache fallback
- **Result**: Real-time updates when connected, cached data when signal drops

### **Scenario 2: Offshore Operations**
- **Internet**: Satellite (slow/expensive)
- **Strategy**: Cache-first, manual sync
- **Result**: Work offline, sync when reaching port or scheduled satellite window

### **Scenario 3: Port Operations**
- **Internet**: Stable WiFi
- **Strategy**: Real-time sync
- **Result**: All devices update instantly, no caching delay

### **Scenario 4: Emergency Response**
- **Internet**: May be unavailable
- **Strategy**: Offline-first
- **Result**: Critical equipment data always accessible from cache

---

## 📊 Monitoring & Diagnostics

### Check Sync Status (Browser DevTools)
```javascript
// Open Console
navigator.serviceWorker.ready.then(reg => {
  return reg.sync.getTags();
}).then(tags => {
  console.log('Pending syncs:', tags);
});
```

### Check Cache Status
```javascript
// Open Console
caches.keys().then(keys => {
  console.log('Cached versions:', keys);
});
```

### View Cached Data
```
1. Open DevTools
2. Application tab
3. Cache Storage → View cached responses
4. IndexedDB → View local data
```

---

## ❓ FAQ

### **Q: Does each user need their own database?**
**A:** No! All users share one PostgreSQL database. The PWA cache is just a local copy for offline access.

### **Q: Can I edit equipment or create work orders while offline?**
**A:** Currently, PWA provides read-only offline access. Data creation/editing requires internet connection. Background sync for offline edits is planned but not yet implemented. Use online mode for all data modifications.

### **Q: How much data is cached per device?**
**A:** Typically 10-50 MB depending on fleet size. Browsers allow 50-100 MB. The app manages cache size automatically.

### **Q: Can I increase cache duration for long voyages?**
**A:** Yes! Modify `CACHE_DURATION` in `service-worker.js`. Recommend 7-30 days for extended offshore operations.

### **Q: Does offline mode work with real-time data?**
**A:** No. Real-time requires internet. Offline mode shows last cached snapshot. Updates resume when reconnected.

### **Q: Is PostgreSQL required, or can I use another database?**
**A:** PostgreSQL is configured, but any database works. PWA only cares about API responses, not the database type.

---

## 🔧 Troubleshooting

### **Issue**: Data not syncing between devices
**Solution**: 
- Check all devices connected to internet
- Verify WebSocket connection in DevTools
- Force refresh cache (clear and reload)

### **Issue**: Cache too large
**Solution**:
- Reduce `CACHE_DURATION` in service worker
- Limit cached endpoints
- Clear old cache versions

### **Issue**: Offline changes not syncing
**Solution**:
- Check Background Sync in DevTools → Application → Background Sync
- Verify internet connection
- Check for JavaScript errors in console

### **Issue**: Stale data showing
**Solution**:
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Clear cache and reload
- Check cache expiration settings

---

## 📚 Related Documentation

- **PWA Installation**: See `IOS_INSTALL.md` for iPhone/iPad setup
- **PWA Verification**: See `PWA_CHECKLIST.md` for testing
- **Database Schema**: See `shared/schema.ts` for data models
- **API Endpoints**: See `server/routes.ts` for backend

---

## ✅ Summary

**Key Takeaways:**

1. ✅ PWA works perfectly with shared PostgreSQL database
2. ✅ Multiple users/devices connect to same database
3. ✅ Each device has its own local cache for offline access (read-only)
4. ✅ Real-time updates when online via WebSocket
5. ✅ Configurable cache duration for maritime operations
6. 🚧 Background sync for offline edits is planned but not yet implemented

**The PWA is a caching layer for offline viewing, not a database replacement.**

---

*Last Updated: October 2025*  
*ARUS Marine Predictive Maintenance System*
