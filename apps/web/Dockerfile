# =====================================
# Stage 1: Dependencies (production only)
# NOTE: npm workspaces (see root package.json "workspaces").
# =====================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm install --omit=dev

# =====================================
# Stage 2: Builder
# =====================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

RUN npm install

# Source already copied above (single COPY phase keeps BuildKit snapshots valid)

# Build shared package first, then the Next.js app.
# NOTE: binaries are invoked from root /app/node_modules/.bin (see apps/api/Dockerfile).
WORKDIR /app
RUN ./node_modules/.bin/tsc -p packages/shared/tsconfig.json

# Build Next.js app
WORKDIR /app/apps/web

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN ../../node_modules/.bin/next build

# =====================================
# Stage 3: Runner
# =====================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production dependencies (hoisted at root; Node resolves them by walking up).
# NOTE: per-package node_modules are symlinks only - intentionally NOT copied.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built app + shared package (with dist)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js (regular start; standalone tracing breaks on npm-workspace symlinks)
WORKDIR /app/apps/web
CMD ["../../node_modules/.bin/next", "start"]
