#!/bin/bash
set -e

echo "Building frontend..."
vite build

echo "Building backend with esbuild config..."
node esbuild.config.js

echo "Build complete!"
