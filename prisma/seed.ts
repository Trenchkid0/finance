/**
 * Seed script — Maybe Finance.
 *
 * Idempotent: re-running wipes a single demo user's data and reseeds it.
 * Real users are never touched.
 *
 *   npm run db:seed
 *
 * After running, sign in with:
 *   email:    demo@maybe.local
 *   password: password123
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@maybe.local";
const DEMO_PASSWORD = "password123";

// --- Default categories (shared across users, isDefault = true) ----------
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Makanan & Minuman", icon: "🍔", color: "#F85149" },
  { name: "Transportasi", icon: "🚗", color: "#388BFD" },
  { name: "Belanja", icon: "🛍️", color: "#A371F7" },
  { name: "Tagihan", icon: "🧾", color: "#D29922" },
  { name: "Hiburan", icon: "🎬", color: "#39D353" },
  { name: "Kesehatan", icon: "💊", color: "#2EA043" },
  { name: "Pendidikan", icon: "📚", color: "#8B949E" },
  { name: "Lainnya", icon: "📦", color: "#8B949E" },
] as const;

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Gaji", icon: "💼", color: "#2EA043" },
  { name: "Bonus", icon: "🎁", color: "#39D353" },
  { name: "Investasi", icon: "📈", color: "#388BFD" },
  { name: "Lainnya", icon: "💰", color: "#8B949E" },
] as const;

// --- Demo accounts -------------------------------------------------------
const DEMO_ACCOUNTS = [
  { name: "BCA Tahapan", type: "bank" as const, balance: 25_000_000, icon: "🏦", color: "#388BFD" },
  { name: "GoPay", type: "wallet" as const, balance: 850_000, icon: "📱", color: "#2EA043" },
  { name: "Tunai", type: "cash" as const, balance: 400_000, icon: "💵", color: "#D29922" },
];

// --- Helpers -------------------------------------------------------------
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// --- Main ----------------------------------------------------------------
async function main() {
  console.log("🌱 Seeding Maybe Finance...\n");

  // 1. Default categories — upserted once, shared (userId = null).
  console.log("→ Default categories");
  await Promise.all([
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { id: `default-expense-${slug(c.name)}` },
        update: { icon: c.icon, color: c.color },
        create: {
          id: `default-expense-${slug(c.name)}`,
          name: c.name,
          type: "expense",
          icon: c.icon,
          color: c.color,
          isDefault: true,
        },
      }),
    ),
    ...DEFAULT_INCOME_CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { id: `default-income-${slug(c.name)}` },
        update: { icon: c.icon, color: c.color },
        create: {
          id: `default-income-${slug(c.name)}`,
          name: c.name,
          type: "income",
          icon: c.icon,
          color: c.color,
          isDefault: true,
        },
      }),
    ),
  ]);

  // 2. Demo user — wipe and recreate cleanly so reseeds are deterministic.
  console.log("→ Demo user");
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      password: passwordHash,
    },
  });

  // 3. Demo accounts.
  console.log("→ Demo accounts");
  const accounts = await Promise.all(
    DEMO_ACCOUNTS.map((a) =>
      prisma.financeAccount.create({
        data: {
          userId: user.id,
          name: a.name,
          type: a.type,
          balance: new Prisma.Decimal(a.balance),
          icon: a.icon,
          color: a.color,
        },
      }),
    ),
  );

  // 4. Pull category lookups for FK references in transactions.
  const expenseCategories = await prisma.category.findMany({
    where: { isDefault: true, type: "expense" },
  });
  const incomeCategories = await prisma.category.findMany({
    where: { isDefault: true, type: "income" },
  });
  const salaryCategory = incomeCategories.find((c) => c.name === "Gaji")!;

  // 5. Transactions — last 60 days of plausible activity.
  console.log("→ Transactions (60 days)");
  const txData: Prisma.TransactionCreateManyInput[] = [];

  // Monthly salary: 1st of this month and 1st of last month.
  const today = new Date();
  for (const offset of [0, 1]) {
    const payDay = new Date(today.getFullYear(), today.getMonth() - offset, 1, 9, 0, 0);
    if (payDay <= today) {
      txData.push({
        userId: user.id,
        accountId: accounts[0].id, // BCA
        categoryId: salaryCategory.id,
        type: "income",
        amount: new Prisma.Decimal(8_500_000),
        description: "Gaji bulanan",
        date: payDay,
      });
    }
  }

  // Daily-ish expenses for 60 days, 1–3 transactions per day.
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const txCountToday = randomInt(1, 3);
    for (let i = 0; i < txCountToday; i++) {
      const cat = pickOne(expenseCategories);
      const account = pickOne(accounts);
      const amount = amountFor(cat.name);
      const date = daysAgo(dayOffset);
      // Stagger times within the day so ordering is deterministic-ish.
      date.setHours(8 + i * 4, randomInt(0, 59), 0, 0);

      txData.push({
        userId: user.id,
        accountId: account.id,
        categoryId: cat.id,
        type: "expense",
        amount: new Prisma.Decimal(amount),
        description: descriptionFor(cat.name),
        date,
      });
    }
  }

  await prisma.transaction.createMany({ data: txData });

  // 6. Reconcile balances. The seeded `balance` values represent the
  //    "current" balance; with the historic transactions inserted, the
  //    derived running total would diverge. Recompute from scratch so
  //    the dashboard matches the transaction log.
  console.log("→ Reconciling account balances");
  for (const account of accounts) {
    const aggregates = await prisma.transaction.groupBy({
      by: ["type"],
      where: { accountId: account.id },
      _sum: { amount: true },
    });

    const sumByType = Object.fromEntries(
      aggregates.map((a) => [a.type, Number(a._sum.amount ?? 0)]),
    ) as Record<"income" | "expense" | "transfer", number>;

    const startingByName: Record<string, number> = {
      "BCA Tahapan": 25_000_000,
      GoPay: 850_000,
      Tunai: 400_000,
    };

    const starting = startingByName[account.name] ?? 0;
    const newBalance =
      starting + (sumByType.income ?? 0) - (sumByType.expense ?? 0);

    await prisma.financeAccount.update({
      where: { id: account.id },
      data: { balance: new Prisma.Decimal(newBalance) },
    });
  }

  console.log("\n✅ Seed complete.");
  console.log("   Login:    " + DEMO_EMAIL);
  console.log("   Password: " + DEMO_PASSWORD);
  console.log(`   ${txData.length} transactions across ${accounts.length} accounts.`);
}

// --- Domain helpers ------------------------------------------------------

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Plausible IDR amount range per expense category. */
function amountFor(categoryName: string): number {
  const ranges: Record<string, [number, number]> = {
    "Makanan & Minuman": [25_000, 150_000],
    Transportasi: [15_000, 80_000],
    Belanja: [50_000, 500_000],
    Tagihan: [100_000, 1_500_000],
    Hiburan: [30_000, 250_000],
    Kesehatan: [50_000, 400_000],
    Pendidikan: [100_000, 600_000],
    Lainnya: [20_000, 200_000],
  };
  const [min, max] = ranges[categoryName] ?? [20_000, 200_000];
  // Round to nearest 1.000 so amounts feel realistic.
  return Math.round(randomInt(min, max) / 1000) * 1000;
}

function descriptionFor(categoryName: string): string {
  const samples: Record<string, string[]> = {
    "Makanan & Minuman": ["Kopi pagi", "Makan siang", "Gojek Food", "GrabFood", "Indomaret"],
    Transportasi: ["GoRide", "Grab", "BBM", "Parkir", "Tol"],
    Belanja: ["Tokopedia", "Shopee", "Indomaret", "Alfamart"],
    Tagihan: ["Listrik PLN", "Internet", "PDAM", "Pulsa & data"],
    Hiburan: ["Spotify", "Netflix", "Bioskop", "Game"],
    Kesehatan: ["Apotek", "Konsultasi dokter", "Vitamin"],
    Pendidikan: ["Buku", "Kursus online", "Webinar"],
    Lainnya: ["Lain-lain"],
  };
  return pickOne(samples[categoryName] ?? ["Transaksi"]);
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
