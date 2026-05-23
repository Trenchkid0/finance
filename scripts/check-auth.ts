/**
 * Diagnostik cepat untuk login problems.
 *
 * Cara pakai:
 *   npx tsx scripts/check-auth.ts demo@maybe.local password123
 *
 * Output mengindikasikan satu dari 4 kondisi:
 *   - "user tidak ada"     → register dulu / jalankan seed
 *   - "user tidak punya password" → register lewat OAuth provider, belum punya password local
 *   - "password salah"     → ketik password lain
 *   - "ok"                 → kredensial valid, login seharusnya sukses
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Pakai: npx tsx scripts/check-auth.ts <email> <password>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log(`→ Cek user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, createdAt: true },
  });

  if (!user) {
    console.error("✗ user tidak ada di DB");
    console.error("  Solusi: register dulu di /register, atau jalankan `npm run db:seed`");
    process.exit(2);
  }

  console.log(`✓ user ditemukan: id=${user.id} dibuat=${user.createdAt.toISOString()}`);

  if (!user.password) {
    console.error("✗ user tidak punya password (kemungkinan dibuat via OAuth)");
    process.exit(3);
  }

  console.log(`✓ password hash tersimpan (${user.password.length} char, prefix=${user.password.slice(0, 7)})`);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    console.error("✗ password tidak cocok");
    process.exit(4);
  }

  console.log("✓ password cocok — login seharusnya sukses");
}

main()
  .catch((err) => {
    console.error("✗ error:", err);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
