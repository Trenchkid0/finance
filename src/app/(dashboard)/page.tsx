import { Banknote, TrendingDown, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  RecentTransactions,
  type RecentTransactionItem,
} from "@/components/dashboard/RecentTransactions";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";

/**
 * Dashboard overview — Server Component. Pulls data directly with
 * Prisma (AGENTS.md §5.2). Middleware guarantees `session?.user.id`.
 */
export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const monthRange = currentAndPreviousMonth();

  const netWorth = await getNetWorth(userId);

  const [
    monthlyIncome,
    monthlyExpenses,
    previousIncome,
    previousExpenses,
    recent,
    cashFlow,
    expenseByCategory,
    netWorthHistory,
  ] = await Promise.all([
    getRangeTotal(userId, "income", monthRange.current.start, monthRange.current.end),
    getRangeTotal(userId, "expense", monthRange.current.start, monthRange.current.end),
    getRangeTotal(userId, "income", monthRange.previous.start, monthRange.previous.end),
    getRangeTotal(userId, "expense", monthRange.previous.start, monthRange.previous.end),
    getRecentTransactions(userId, 8),
    getCashFlowTrend(userId, 6),
    getExpenseByCategory(userId),
    getNetWorthHistory(userId, netWorth, 6),
  ]);

  // Cash flow for the running month — "sisa duit bulan ini".
  // Positive → ada surplus yang bisa ditabung; negatif → defisit.
  const monthlyNet = monthlyIncome - monthlyExpenses;

  // Period-over-period ratios. Returns `undefined` when last month was
  // zero so the card hides the delta line instead of dividing by zero.
  const incomeDelta = ratioDelta(monthlyIncome, previousIncome);
  const expenseDelta = ratioDelta(monthlyExpenses, previousExpenses);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">
          Ringkasan posisi keuangan Anda bulan ini.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <NetWorthCard amount={netWorth} history={netWorthHistory} />
        <StatCard
          label="Pemasukan bulan ini"
          amount={monthlyIncome}
          delta={incomeDelta}
          tone="income"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Pengeluaran bulan ini"
          amount={monthlyExpenses}
          delta={expenseDelta}
          // Naik = jelek untuk pengeluaran, jadi balik palet warna delta.
          invertDeltaColor
          tone="expense"
          icon={<TrendingDown size={16} />}
        />
        <StatCard
          label="Sisa bulan ini"
          amount={monthlyNet}
          // Color the value by sign so a deficit is read at a glance.
          tone={monthlyNet >= 0 ? "income" : "expense"}
          icon={<Banknote size={16} />}
          showSign
        />
      </section>

      {/* Charts — cash-flow trend (wider) + category breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlow} />
        </div>
        <div className="lg:col-span-1">
          <ExpensePieChart data={expenseByCategory} />
        </div>
      </section>

      <section>
        <RecentTransactions transactions={recent} />
      </section>
    </div>
  );
}

// --- Queries -------------------------------------------------------------

async function getNetWorth(userId: string): Promise<number> {
  const accounts = await prisma.financeAccount.findMany({
    where: { userId, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Number(a.balance), 0);
}

async function getRangeTotal(
  userId: string,
  type: "income" | "expense",
  start: Date,
  end: Date,
): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { userId, type, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

async function getRecentTransactions(
  userId: string,
  take: number,
): Promise<RecentTransactionItem[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId, type: { in: ["income", "expense"] } },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take,
  });

  return rows.map((tx) => ({
    id: tx.id,
    description: tx.description ?? tx.category?.name ?? "Transaksi",
    categoryName: tx.category?.name ?? "Lainnya",
    accountName: tx.account.name,
    date: tx.date,
    // Decimal must be serialised before crossing the SC → CC boundary.
    amount: Number(tx.amount),
    type: tx.type as "income" | "expense",
  }));
}

/**
 * Income vs expense totals per month over the last `months` months.
 * Returns oldest → newest so the chart renders left-to-right naturally.
 *
 * One round trip: pull every transaction in the window, then bucket
 * client-side. For a personal-finance scale (1k–10k tx/yr) this is
 * cheaper than 2N aggregate queries and avoids row-by-row date math.
 */
async function getCashFlowTrend(
  userId: string,
  months: number,
): Promise<{ month: string; income: number; expense: number }[]> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ["income", "expense"] },
      date: { gte: windowStart },
    },
    select: { type: true, amount: true, date: true },
  });

  // Pre-seed every bucket so months with zero activity still show on the axis.
  const buckets = new Map<string, { month: string; income: number; expense: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(d), {
      month: monthLabel(d),
      income: 0,
      expense: 0,
    });
  }

  for (const tx of rows) {
    const bucket = buckets.get(monthKey(tx.date));
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += Number(tx.amount);
    else if (tx.type === "expense") bucket.expense += Number(tx.amount);
  }

  return [...buckets.values()];
}

/** Pengeluaran bulan berjalan, dikelompokkan per kategori, urut terbesar. */
async function getExpenseByCategory(
  userId: string,
): Promise<{ category: string; amount: number }[]> {
  const start = startOfThisMonth();

  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "expense", date: { gte: start } },
    _sum: { amount: true },
  });

  const categoryIds = grouped
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);

  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return grouped
    .map((g) => ({
      category: g.categoryId ? nameById.get(g.categoryId) ?? "Lainnya" : "Lainnya",
      amount: Number(g._sum.amount ?? 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// --- Date / math helpers -------------------------------------------------

function startOfThisMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Half-open ranges [start, end) for the current and previous calendar
 * months. Using `< end` instead of `<= end-1ms` is safer at month
 * boundaries and lets aggregates use a clean `lt`.
 */
function currentAndPreviousMonth() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    current: { start: currentStart, end: nextStart },
    previous: { start: previousStart, end: currentStart },
  };
}

/**
 * Period-over-period ratio as `(now - prev) / prev`. Returns `undefined`
 * when prev is zero — the UI hides the delta line instead of showing
 * "+∞" or some misleading "+100%".
 */
function ratioDelta(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return (current - previous) / previous;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d);
}

async function getNetWorthHistory(
  userId: string,
  currentNetWorth: number,
  months: number = 6
): Promise<{ month: string; value: number }[]> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ["income", "expense"] },
      date: { gte: windowStart },
    },
    select: { type: true, amount: true, date: true },
  });

  const monthChanges = new Map<string, number>();
  
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthChanges.set(key, 0);
  }

  for (const tx of transactions) {
    const d = tx.date;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthChanges.has(key)) {
      const amt = Number(tx.amount);
      const delta = tx.type === "income" ? amt : -amt;
      monthChanges.set(key, (monthChanges.get(key) || 0) + delta);
    }
  }

  const history: { month: string; value: number }[] = [];
  const monthKeys: string[] = [];
  const monthLabels: string[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    monthLabels.push(new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d));
  }

  let runningNetWorth = currentNetWorth;
  const values: number[] = new Array(months);
  for (let i = months - 1; i >= 0; i--) {
    values[i] = runningNetWorth;
    const key = monthKeys[i];
    const changeInMonth = monthChanges.get(key) || 0;
    runningNetWorth -= changeInMonth;
  }

  for (let i = 0; i < months; i++) {
    history.push({
      month: monthLabels[i],
      value: values[i] < 0 ? 0 : values[i],
    });
  }

  return history;
}
