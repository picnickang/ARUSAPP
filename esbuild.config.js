import * as esbuild from 'esbuild';

// Build backend bundle
// server/vite.ts is only loaded in development via dynamic import
// In production, server/index.ts uses express.static directly
await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  // Ignore server/vite.ts and vite packages since they're dev-only
  external: ['./vite.ts', './vite']
});
