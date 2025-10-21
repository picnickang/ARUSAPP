import * as esbuild from 'esbuild';
import path from 'path';

// Plugin to replace Vite imports with stubs (they're only used in dev mode anyway)
const viteStubPlugin = {
  name: 'vite-stub',
  setup(build) {
    // Intercept vite package imports and provide stubs
    build.onResolve({ filter: /^vite$/ }, args => ({
      path: args.path,
      namespace: 'vite-stub'
    }));
    
    build.onResolve({ filter: /^@vitejs\// }, args => ({
      path: args.path,
      namespace: 'vite-stub'
    }));
    
    build.onResolve({ filter: /^@replit\/vite-/ }, args => ({
      path: args.path,
      namespace: 'vite-stub'
    }));
    
    // Provide stub implementations (empty exports)
    build.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({
      contents: 'export default {}; export const createServer = () => {}; export const createLogger = () => {}; export const defineConfig = (c) => c;',
      loader: 'js'
    }));
  }
};

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  plugins: [viteStubPlugin]
});
