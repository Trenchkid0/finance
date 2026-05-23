#!/bin/sh
# =============================================================================
# Container entrypoint — sinkronkan schema lalu exit.
#
# Alur:
#   1. Tunggu database ready (TCP probe maks WAIT_TIMEOUT detik)
#   2. Jalankan `prisma db push` (idempoten — kosong kalau schema sudah sinkron)
#   3. Optional: jalankan seed kalau env SEED_ON_STARTUP=true
#   4. exit 0 → trigger `app` start (compose service_completed_successfully)
#
# DB target ditentukan oleh DB_HOST / DB_PORT (default host.docker.internal:3306).
# Pakai stage `builder` karena butuh node_modules + prisma CLI yang tidak
# ada di image runtime.
# =============================================================================

set -eu

DB_HOST="${DB_HOST:-host.docker.internal}"
DB_PORT="${DB_PORT:-3306}"
# Timeout default 60 detik supaya skenario remote DB (LAN/VPN) yang
# kadang lambat connect punya cukup ruang. Bisa di-override via env.
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"

echo "→ Probing database TCP ${DB_HOST}:${DB_PORT} (max ${WAIT_TIMEOUT}s)..."

waited=0
while ! nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null; do
  waited=$((waited + 1))
  if [ "${waited}" -ge "${WAIT_TIMEOUT}" ]; then
    echo "✗ Database tidak ready setelah ${WAIT_TIMEOUT}s pada ${DB_HOST}:${DB_PORT}."
    echo "  Cek:"
    echo "  - MySQL listen di alamat yang benar (bukan hanya 127.0.0.1)"
    echo "  - Firewall mengizinkan port ${DB_PORT} dari subnet docker"
    echo "  - DATABASE_URL_INTERNAL host = ${DB_HOST}"
    exit 1
  fi
  sleep 1
done

echo "✓ Database TCP ${DB_HOST}:${DB_PORT} ready."

echo "→ Sinkronisasi schema (prisma db push)..."
npx prisma db push --skip-generate

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "→ Menjalankan seed (SEED_ON_STARTUP=true)..."
  npx prisma db seed || echo "⚠ Seed gagal — lanjut tanpa seed."
fi

echo "✓ Setup selesai."
