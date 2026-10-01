# ── Stage 1: Builder ──────────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency files first (layer cache)
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Type-check only (bun runs TS natively — no build step needed)
RUN bun run typecheck

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM oven/bun:1-slim AS runtime

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy source (bun runs TS directly — no compiled output needed)
COPY src/ ./src/
COPY tsconfig.json ./

# Non-root user for security
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["bun", "src/index.ts"]
