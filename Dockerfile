# syntax=docker/dockerfile:1.7

# =============================================================================
# Maybe Finance — Production image (multi-stage)
#
# Stage layout:
#   1. deps    → install dependencies (cached)
#   2. builder → prisma generate + next build (output: standalone)
#   3. runner  → tipis: hanya .next/standalone + .next/static + public
#
# Image akhir ~150MB (Alpine + node + standalone server). Tidak bawa
# source code, devDependencies, atau prisma engine yang tidak dipakai
# runtime.
# =============================================================================

ARG NODE_VERSION=22-alpine

# -----------------------------------------------------------------------------
# 1. Install dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

# `libc6-compat` dibutuhkan oleh Prisma engine + sharp di Alpine.
# `openssl` adalah peer dep Prisma 6 di Linux musl.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Salin manifest dulu supaya layer dependency bisa di-cache antar build.
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# `npm ci` lebih deterministik daripada `npm install` di CI/Docker.
RUN npm ci --no-audit --no-fund

# -----------------------------------------------------------------------------
# 2. Build
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Salin node_modules dari stage deps (sudah include @prisma/client kosong).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Salin source.
COPY . .

# Generate Prisma client untuk Linux musl (default `prisma generate`
# di stage build mendeteksi platform target dan men-generate engine
# yang cocok dengan runtime image).
RUN npx prisma generate

# Build Next.js (output: standalone, lihat next.config.ts).
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
RUN npm run build

# -----------------------------------------------------------------------------
# 3. Runtime
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

RUN apk add --no-cache libc6-compat openssl curl tini

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root untuk runtime — best practice security.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone server membundel hanya kode yang dipakai runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + engine. Standalone output TIDAK menyalin folder
# `prisma/`, jadi kalau ada Server Action yang baca `schema.prisma`
# atau migrasi runtime, dia harus tetap ada. Kita salin schema saja —
# engine sudah ikut di node_modules/.prisma yang dibungkus standalone.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Healthcheck dipakai docker-compose untuk gate dependency `depends_on`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/login >/dev/null || exit 1

USER nextjs

EXPOSE 3000

# tini sebagai PID 1 supaya signal SIGTERM dari `docker stop` sampai
# ke node process dan graceful shutdown jalan.
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
