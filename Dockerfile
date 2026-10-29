# Dockerfile — for containerized deployments of Linguava.
# Use this if you want to deploy to:
#   - AWS ECS / Fargate
#   - Google Cloud Run
#   - DigitalOcean App Platform
#   - Self-hosted Docker / Docker Swarm
#   - Kubernetes
#
# For Vercel/AWS EC2 (Node-direct), you don't need this — see docs/.

# ---------- Stage 1: deps ----------
FROM oven/bun:1.1 AS deps
WORKDIR /app

# Copy lockfile + package.json first for better layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- Stage 2: builder ----------
FROM oven/bun:1.1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Required at build time
ENV NEXTAUTH_SECRET=build-placeholder-not-real
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=file:./db/build.db

# Generate Prisma client and push schema (creates the SQLite file for build-time)
RUN bun run db:generate
RUN bun run db:push

# Build the standalone Next.js server
RUN bun run build

# ---------- Stage 3: runner ----------
FROM oven/bun:1.1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/public ./public

# Copy the Prisma client (generated during build)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Create a writable DB directory (SQLite only — for Postgres, this is unused)
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db
VOLUME ["/app/db"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["bun", "server.js"]
