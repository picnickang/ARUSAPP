# Multi-stage build for ARUS (Marine Predictive Maintenance & Scheduling)
FROM node:20-slim AS builder

# Install dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all deps (including dev for build)
RUN npm ci

# Copy source code and build
COPY . .

# Ensure the build command matches package.json
RUN npm run build

# Remove devDependencies to keep only production modules (prune)
RUN npm prune --production

# Production stage: smaller and only runtime deps
FROM node:20-slim AS production

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash arus

WORKDIR /app

# Copy only what we need from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Fix permissions and switch to non-root
RUN chown -R arus:nodejs /app
USER arus

ENV NODE_ENV=production
EXPOSE 5000

# Optional: healthcheck can be added if you have an unauthenticated endpoint
# HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:5000/ || exit 1

CMD ["node", "dist/index.js"]