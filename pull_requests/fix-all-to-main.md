### chore: apply fixes (Dockerfile, vite config, session middleware, package.json, CI, dependabot)

This PR applies an initial set of repo hygiene and build/runtime fixes:

- Improve Dockerfile: multi-stage builder, run npm run build, prune devDependencies in builder and copy only dist + pruned node_modules to production stage; switch to non-root user.
- Convert vite.config.ts to async export to avoid top-level await and gracefully handle optional Replit dev plugins.
- Add secure session middleware at server/middleware/session.ts with connect-pg-simple and secure cookie defaults.
- Update package.json scripts: add cross-env (dev cross-platform), lint and test scripts, align build to use esbuild.config.js.
- Add GitHub Actions CI workflow to run type-check, lint, build, tests, and npm audit on push/PR.
- Add Dependabot config to keep npm deps updated weekly.

**Notes & follow-ups:**
- I did not prune or remove actual dependencies (that requires checking runtime usage). Next PR should run depcheck and remove unused deps.
- Verify session store preference (connect-pg-simple used as example). If you prefer Redis or memorystore I can update accordingly.
- Consider adding a lightweight unauthenticated /health endpoint suitable for Docker HEALTHCHECK.

This PR was prepared and pushed by Copilot on behalf of picnickang; please review CI results and address any type/lint failures.