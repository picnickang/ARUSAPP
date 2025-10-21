import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  external: [
    'vite',
    '@vitejs/*',
    '@replit/vite-*'
  ]
});
