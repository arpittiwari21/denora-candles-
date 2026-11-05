# =========================================================================
# Multi-Stage Dockerfile for Denora Candles Backend API
# Optimized for Google Cloud Run (Serverless, Minimal Footprint, Fast Cold Start)
# =========================================================================

# -------------------------------------------------------------------------
# STAGE 1: Base & Dependencies
# -------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies if needed (e.g. for native bindings or OpenSSL for Prisma)
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# -------------------------------------------------------------------------
# STAGE 2: TypeScript Build
# -------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Prune devDependencies to keep the production layer slim
RUN npm prune --production

# -------------------------------------------------------------------------
# STAGE 3: Production Runner (Final Lean Image)
# -------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Add dumb-init for proper PID 1 signal forwarding (SIGTERM / SIGINT) on Cloud Run
RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production
ENV PORT=8080

# Security: Create non-root system user & group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Copy pruned production dependencies, Prisma engine, and compiled dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json

USER appuser

# Google Cloud Run dynamically routes traffic to PORT (default 8080)
EXPOSE 8080

# Health check to ensure zero-downtime rolling deployments
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
