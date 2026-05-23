/**
 * Cek isi tabel api_keys saat ini.
 *
 *   npx tsx scripts/check-api-keys.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (rows.length === 0) {
    console.log("Tidak ada kunci API tersimpan.");
    return;
  }

  console.log(`${rows.length} kunci ditemukan:`);
  for (const r of rows) {
    const status = r.revokedAt ? "REVOKED" : "active";
    console.log(
      `  - ${r.name.padEnd(20)} prefix=${r.keyPrefix.padEnd(14)} ${status} created=${r.createdAt.toISOString()}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
