#!/bin/bash
# Build server as CommonJS for pkg compatibility
# pkg cannot handle ESM modules, so we need a separate CommonJS build

set -e

echo "Building CommonJS bundle for standalone executables..."

# Build frontend first
echo "Building frontend..."
npm run build > /dev/null 2>&1 || (echo "Frontend build with vite"; vite build)

# Build server as CommonJS
echo "Building server (CommonJS)..."
esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=cjs \
  --outdir=dist/cjs \
  --minify

echo "✅ CommonJS build complete: dist/cjs/index.js"
