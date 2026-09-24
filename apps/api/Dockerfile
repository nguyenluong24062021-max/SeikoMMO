# =====================================
# Stage 1: Dependencies (production only)
# NOTE: npm workspaces (see root package.json "workspaces").
# pnpm is intentionally NOT used here: pnpm@8.15.0 ships no linux musl
# binary and OneDrive breaks pnpm on dev machines.
# =====================================
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm install --omit=dev

# =====================================
# Stage 2: Builder
# =====================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

# Copy package files AND full source first, then install ONCE.
# Rationale: COPY-ing source over npm-created node_modules (symlinks)
# breaks BuildKit snapshotting ("cannot replace directory with file").
COPY package.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

RUN npm install

# Source already copied above (single COPY phase keeps BuildKit snapshots valid)

# Build shared package first, then generate Prisma client + build API.
# NOTE: binaries are invoked from root /app/node_modules/.bin because npm
# resolves workspace script binaries from the package's own node_modules.
WORKDIR /app
RUN ./node_modules/.bin/tsc -p packages/shared/tsconfig.json

# Generate Prisma client + build API
WORKDIR /app/apps/api
RUN ../../node_modules/.bin/prisma generate
RUN ../../node_modules/.bin/nest build

# =====================================
# Stage 3: Runner
# =====================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

# Set working directory to API
WORKDIR /app/apps/api

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
