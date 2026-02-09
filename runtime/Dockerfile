# =============================================================================
# AgentL2 Runtime Dockerfile
# =============================================================================
# Multi-stage build for API, Worker, and Listener services

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# =============================================================================
# API Server
# =============================================================================
FROM node:20-alpine AS api

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/api/server.js"]

# =============================================================================
# Worker (Order Processor)
# =============================================================================
FROM node:20-alpine AS worker

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/worker/index.js"]

# =============================================================================
# Blockchain Listener
# =============================================================================
FROM node:20-alpine AS listener

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/listener/index.js"]
