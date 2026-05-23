import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BudgetClient,
  type BudgetCategoryData,
} from "@/components/budget/BudgetClient";

/**
 * Budget Page — Server Component (Maybe-Finance-style).
 *
 * URL state: `?month=YYYY-MM` (default = bulan berjalan). Picker bulan
 * di client tinggal navigate ke `?month=...` sehingga state bisa
 * di-bookmark / share.
 */

type SearchParams = Promise<{ month?: string }>;

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;

  const { year, month, monthStart, nextMonthStart } = parseMonth(
    params.month,
  );

  // Fetch:
  //  - allCategories (untuk render daftar di kanan, urutan stabil)
  //  - userBudgets (limit per kategori — model `Budget` belum month-scoped,
  //    berlaku untuk semua bulan; OK untuk MVP)
  //  - monthlyAgg (sum spent per kategori dalam bulan ini)
  //  - monthlyIncome (total income bulan ini)
  const [allCategories, userBudgets, monthlyAgg, monthlyIncomeAgg] =
    await Promise.all([
      prisma.category.findMany({
        where: {
          type: "expense",
          OR: [{ userId: null }, { userId }],
        },
        select: { id: true, name: true, icon: true, color: true },
      }),
      prisma.budget.findMany({
        where: { userId },
        select: { categoryId: true, limit: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId,
          type: "expense",
          date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "income",
          date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
    ]);

  const limits = new Map<string, number>();
  for (const b of userBudgets) limits.set(b.categoryId, Number(b.limit));

  const spent = new Map<string, number>();
  for (const g of monthlyAgg) {
    if (!g.categoryId) continue;
    spent.set(g.categoryId, Number(g._sum.amount ?? 0));
  }

  // Total spent termasuk transaksi tanpa kategori (uncategorized).
  const totalSpent = monthlyAgg.reduce(
    (sum, g) => sum + Number(g._sum.amount ?? 0),
    0,
  );
  const uncategorizedSpent = monthlyAgg
    .filter((g) => !g.categoryId)
    .reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);

  const monthlyIncome = Number(monthlyIncomeAgg._sum.amount ?? 0);

  const categories: BudgetCategoryData[] = allCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color ?? "#388BFD",
    spent: spent.get(cat.id) ?? 0,
    limit: limits.get(cat.id) ?? null,
  }));

  // Sort: aktif (ada limit atau spent) lebih dulu, lalu alfabet.
  categories.sort((a, b) => {
    const aActive = a.spent > 0 || a.limit !== null;
    const bActive = b.spent > 0 || b.limit !== null;
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (b.spent !== a.spent) return b.spent - a.spent;
    return a.name.localeCompare(b.name);
  });

  // Daftar tahun yang valid di picker — kita kasih ±2 tahun dari sekarang
  // sebagai cakupan default. Bisa di-extend kalau user butuh history lebih.
  const now = new Date();
  const yearOptions = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <BudgetClient
      monthLabel={formatMonthLabel(year, month)}
      year={year}
      month={month}
      yearOptions={yearOptions}
      isCurrentMonth={
        year === now.getFullYear() && month === now.getMonth() + 1
      }
      categories={categories}
      totalSpent={totalSpent}
      uncategorizedSpent={uncategorizedSpent}
      monthlyIncome={monthlyIncome}
    />
  );
}

// --- Month parsing -------------------------------------------------------

interface ParsedMonth {
  year: number;
  /** 1..12 */
  month: number;
  monthStart: Date;
  nextMonthStart: Date;
}

function parseMonth(raw: string | undefined): ParsedMonth {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (
      y >= 2000 &&
      y <= now.getFullYear() + 1 &&
      m >= 1 &&
      m <= 12
    ) {
      year = y;
      month = m;
    }
  }

  const monthStart = new Date(year, month - 1, 1);
  const nextMonthStart = new Date(year, month, 1);

  return { year, month, monthStart, nextMonthStart };
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}
