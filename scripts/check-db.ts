/**
 * Diagnostik koneksi DB.
 *
 * Pakai DATABASE_URL persis seperti yang dibaca aplikasi (lewat dotenv
 * yang Prisma muat otomatis). Tujuan: deteksi masalah klasik:
 *   - URL salah / user-pass salah → tcp ok tapi auth gagal
 *   - Firewall / wrong host → connect timeout / ECONNREFUSED
 *   - Schema belum di-push → query "SHOW TABLES" kosong
 *
 *   npx tsx scripts/check-db.ts
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
console.log("→ DATABASE_URL =", redact(url));

if (!url) {
  console.error("✗ DATABASE_URL belum di-set di .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

async function main() {
  console.log("→ Connect…");
  const t0 = Date.now();
  await prisma.$connect();
  console.log(`✓ TCP + auth ok dalam ${Date.now() - t0}ms`);

  console.log("→ SELECT 1…");
  const ping = await prisma.$queryRawUnsafe<Array<{ ok: number }>>(
    "SELECT 1 AS ok",
  );
  console.log(`✓ Server merespon: ${JSON.stringify(ping)}`);

  console.log("→ Cek tabel-tabel yang dibutuhkan…");
  const tables = await prisma.$queryRawUnsafe<Array<{ TABLE_NAME: string }>>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`,
  );
  if (tables.length === 0) {
    console.error("✗ Database kosong (belum ada tabel)");
    console.error("  Solusi: npm run db:push  (atau prisma db push)");
    process.exit(2);
  }
  console.log(`✓ ${tables.length} tabel ditemukan:`);
  for (const t of tables) console.log(`    - ${t.TABLE_NAME}`);

  console.log("→ Hitung user…");
  const userCount = await prisma.user.count();
  console.log(`✓ ${userCount} user terdaftar`);
  if (userCount === 0) {
    console.warn("⚠ Belum ada user — register dulu di /register atau jalankan `npm run db:seed`");
  }
}

function redact(u: string | undefined): string {
  if (!u) return "(unset)";
  // mysql://USER:PASS@HOST:PORT/DB → mysql://USER:****@HOST:PORT/DB
  return u.replace(/(:\/\/[^:]+:)([^@]+)(@)/, "$1****$3");
}

main()
  .catch((err) => {
    console.error("✗ error:", err);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
