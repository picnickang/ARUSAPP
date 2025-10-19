#!/usr/bin/env node
/**
 * Quick launcher for ARUS Electron Desktop App
 * This starts the desktop application without needing a browser
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ARUS Desktop Application...\n');

// Start Electron
const electron = require('electron');
const electronProcess = spawn(electron, [path.join(__dirname, 'electron/main.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

electronProcess.on('close', (code) => {
  console.log(`\n✅ ARUS Desktop closed with code ${code}`);
  process.exit(code);
});

electronProcess.on('error', (err) => {
  console.error('❌ Failed to start Electron:', err);
  process.exit(1);
});
