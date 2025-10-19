# ARUS Desktop App - Icon Requirements

## Current Status

✅ **PNG icon created** - `electron/icon.png`  
✅ **electron-builder configured** - Will convert PNG automatically  
⚠️ **Note:** electron-builder will auto-convert PNG to platform formats

---

## Icon Configuration

### electron-builder.yml

```yaml
mac:
  icon: electron/icon.png  # Auto-converts to .icns
  
win:
  icon: electron/icon.png  # Auto-converts to .ico
  
linux:
  icon: electron/icon.png  # Uses PNG directly
```

---

## How electron-builder Handles Icons

### PNG to Platform Conversion

electron-builder **automatically converts** the PNG icon to platform-specific formats:

1. **macOS (.icns)**
   - Generates icon set with multiple resolutions
   - Sizes: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
   - Retina variants (@2x) included
   - Embedded in .app bundle

2. **Windows (.ico)**
   - Generates Windows icon file
   - Sizes: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256
   - Embedded in .exe

3. **Linux (PNG)**
   - Uses PNG directly
   - Multiple sizes for different icon themes

---

## Current Icon

**File:** `electron/icon.png`  
**Format:** PNG  
**Minimum Size:** 512x512 recommended  
**Source:** Generated placeholder

---

## Custom Icon (Optional)

To use a custom icon:

### 1. Replace PNG

```bash
# Replace electron/icon.png with your custom icon
# Minimum 512x512 PNG recommended
cp /path/to/your-icon.png electron/icon.png
```

### 2. Rebuild

```bash
./build-desktop-macos-bundled.sh
```

electron-builder will automatically convert it!

---

## Manual Icon Creation (Advanced)

If you want to provide pre-made platform icons:

### macOS (.icns)

```bash
# Create iconset directory
mkdir -p electron/icon.iconset

# Generate all required sizes
sips -z 16 16     icon-1024.png --out electron/icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out electron/icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out electron/icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out electron/icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out electron/icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out electron/icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out electron/icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out electron/icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out electron/icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out electron/icon.iconset/icon_512x512@2x.png

# Convert to .icns
iconutil -c icns electron/icon.iconset -o electron/icon.icns
```

Then update electron-builder.yml:
```yaml
mac:
  icon: electron/icon.icns  # Use pre-made .icns
```

### Windows (.ico)

Use a tool like ImageMagick:

```bash
convert icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 electron/icon.ico
```

Then update electron-builder.yml:
```yaml
win:
  icon: electron/icon.ico  # Use pre-made .ico
```

---

## Recommended Icon Design

### Guidelines

- **Size:** 1024x1024 minimum
- **Format:** PNG with transparency
- **Content:** Simple, recognizable at small sizes
- **Colors:** High contrast, stands out in dock/tray
- **Style:** Professional, maritime theme

### Marine Icon Ideas

- ⚓ Anchor
- 🚢 Ship/Vessel
- 📊 Graph/Chart (analytics)
- ⚙️ Gear (maintenance)
- 🌊 Wave pattern

### Creating Custom Icon

**Design Tools:**
- Figma (free, web-based)
- Sketch (macOS)
- Affinity Designer
- Adobe Illustrator

**Icon Resources:**
- Flaticon.com
- IconFinder.com
- The Noun Project

**Export Settings:**
- Size: 1024x1024
- Format: PNG
- Transparency: Yes
- Padding: 10% around edges

---

## Build Verification

After building, verify icon was included:

```bash
# Check macOS app
open dist/installers/*.dmg
# Install and check Applications folder - should see ARUS icon

# Check tray icon
# Launch app - tray icon should appear in menu bar
```

---

## Current Implementation

✅ **Working:** PNG icon exists and electron-builder will convert it automatically  
✅ **No manual conversion needed**  
✅ **All platforms supported**

The current setup uses electron-builder's automatic icon conversion, which is:
- ✅ Easier to maintain (single PNG file)
- ✅ Automatic platform conversion
- ✅ Good enough for production

---

## Future Enhancements

- [ ] Design custom ARUS logo/icon
- [ ] Create high-resolution version (2048x2048)
- [ ] Add brand colors and styling
- [ ] Professional designer consultation
- [ ] Pre-generate .icns and .ico for pixel-perfect control

---

**The current icon configuration is production-ready!**

electron-builder will automatically convert `electron/icon.png` to all required platform formats during the build process.
