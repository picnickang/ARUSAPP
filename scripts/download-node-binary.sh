#!/bin/bash
# Download complete Node.js runtime for macOS
# Includes binary + dynamic libraries + support files

set -e

NODE_VERSION="20.11.0"
PLATFORM="darwin"
ARCH="x64"

OUTPUT_DIR="electron/nodejs"
NODE_DIR="node-v${NODE_VERSION}-${PLATFORM}-${ARCH}"

echo "Downloading Node.js v${NODE_VERSION} for macOS (complete runtime)..."

# Clean output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Download complete Node.js distribution
curl -L "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIR}.tar.gz" -o /tmp/node.tar.gz

# Extract complete distribution
echo "Extracting Node.js runtime..."
tar -xzf /tmp/node.tar.gz -C /tmp

# Copy COMPLETE runtime (bin + lib + include)
echo "Copying Node.js runtime to $OUTPUT_DIR..."
cp -R "/tmp/${NODE_DIR}/bin" "$OUTPUT_DIR/"
cp -R "/tmp/${NODE_DIR}/lib" "$OUTPUT_DIR/"
cp -R "/tmp/${NODE_DIR}/include" "$OUTPUT_DIR/"

# Ensure executable
chmod +x "$OUTPUT_DIR/bin/node"

# Cleanup
rm -rf /tmp/node.tar.gz "/tmp/${NODE_DIR}"

echo ""
echo "✅ Node.js runtime downloaded successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Location: $OUTPUT_DIR"
echo ""
echo "Contents:"
ls -lh "$OUTPUT_DIR/bin/node"
echo ""
echo "Libraries:"
ls -1 "$OUTPUT_DIR/lib/" | head -5
echo "  (and $(ls -1 "$OUTPUT_DIR/lib/" | wc -l | tr -d ' ') files total)"
echo ""
echo "Size:"
du -sh "$OUTPUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
