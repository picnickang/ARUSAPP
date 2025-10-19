#!/bin/bash
# Download standalone Node.js binary for macOS
# This will be bundled inside the Electron app

set -e

NODE_VERSION="20.11.0"
PLATFORM="darwin"
ARCH="x64"

OUTPUT_DIR="electron/bin"
mkdir -p "$OUTPUT_DIR"

echo "Downloading Node.js v${NODE_VERSION} for macOS..."

# Download Node.js binary
curl -L "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${PLATFORM}-${ARCH}.tar.gz" -o /tmp/node.tar.gz

# Extract just the node binary
tar -xzf /tmp/node.tar.gz -C /tmp
cp "/tmp/node-v${NODE_VERSION}-${PLATFORM}-${ARCH}/bin/node" "$OUTPUT_DIR/node"
chmod +x "$OUTPUT_DIR/node"

# Cleanup
rm -rf /tmp/node.tar.gz "/tmp/node-v${NODE_VERSION}-${PLATFORM}-${ARCH}"

echo "✅ Node.js binary downloaded to $OUTPUT_DIR/node"
ls -lh "$OUTPUT_DIR/node"
