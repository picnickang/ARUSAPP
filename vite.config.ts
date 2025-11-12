import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * Async Vite config to safely import optional dev-only plugins
 * (avoids top-level await and improves compatibility)
 */
export default defineConfig(async () => {
  const devPlugins: any[] = [];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    // Dynamically import replit dev plugins when available
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer());
      const devBanner = await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner());
      devPlugins.push(cartographer, devBanner);
    } catch (e) {
      // Fail gracefully if plugins are not available in environments like CI
      // console.warn("Optional replit dev plugins not available", e);
    }
  }

  // Resolve directory roots using import.meta.url for ESM compatibility
  const rootDir = path.resolve(new URL(".", import.meta.url).pathname, "client");
  const projectRoot = path.resolve(new URL(".", import.meta.url).pathname);

  return {
    plugins: [react(), runtimeErrorOverlay(), ...devPlugins],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    root: rootDir,
    build: {
      outDir: path.resolve(projectRoot, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});