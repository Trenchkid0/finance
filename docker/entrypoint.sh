#!/bin/sh
# =============================================================================
# Container entrypoint — sinkronkan schema lalu start server.
#
# Alur:
#   1. Tunggu database ready (TCP probe maks 30 detik)
#   2. Jalankan `prisma db push` (idempoten — kosong kalau schema sudah sinkron)
#   3. Optional: jalankan seed kalau env SEED_ON_STARTUP=true
#   4. exec server (PID 1 sehingga signal SIGTERM diteruskan)
#
# Skrip ini dijalankan dari image bertipe `seeder` di docker-compose
# (lihat compose), bukan dari image `runner` utama yang USER nextjs.
# Kita perlu node_modules + schema + binary prisma — itu sebabnya
# seeder pakai stage `builder` bukan `runner`.
# =============================================================================

set -eu

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-30}"

echo "→ Waiting for database ${DB_HOST}:${DB_PORT} (max ${WAIT_TIMEOUT}s)..."

waited=0
while ! nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null; do
  waited=$((waited + 1))
  if [ "${waited}" -ge "${WAIT_TIMEOUT}" ]; then
    echo "✗ Database tidak ready setelah ${WAIT_TIMEOUT}s. Abort."
    exit 1
  fi
  sleep 1
done

echo "✓ Database ready."

echo "→ Sinkronisasi schema (prisma db push)..."
npx prisma db push --skip-generate

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "→ Menjalankan seed (SEED_ON_STARTUP=true)..."
  npx prisma db seed || echo "⚠ Seed gagal — lanjut tanpa seed."
fi

echo "✓ Setup selesai."
