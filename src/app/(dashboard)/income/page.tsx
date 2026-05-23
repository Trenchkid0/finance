import { startOfMonth, subMonths } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMonthLabel } from "@/lib/utils/formatters";
import { IncomeClient } from "@/components/income/IncomeClient";

/**
 * Income Analytics Page — Server Component.
 * Fetches transactions of type 'income' and processes statistics.
 */
export default async function IncomePage() {
  const session = await auth();
  const userId = session!.user.id;

  // 1. Fetch all income transactions for calculations
  const allIncome = await prisma.transaction.findMany({
    where: {
      userId,
      type: "income",
    },
    include: {
      account: { select: { name: true } },
      category: { select: { name: true, icon: true } },
    },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  // Current Month Total
  const currentMonthTotal = allIncome
    .filter((tx) => new Date(tx.date) >= currentMonthStart)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Previous month total — used for the period-over-period delta on
  // the "Bulan ini" KPI. We use the last full month, not "today minus
  // 30 days", to keep the comparison aligned with the dashboard.
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthTotal = allIncome
    .filter(
      (tx) =>
        new Date(tx.date) >= previousMonthStart &&
        new Date(tx.date) < currentMonthStart,
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const monthlyDelta =
    previousMonthTotal === 0
      ? undefined
      : (currentMonthTotal - previousMonthTotal) / previousMonthTotal;

  // Maximum Single Income
  const maxIncomeTx = allIncome.reduce((max, tx) => {
    const amt = Number(tx.amount);
    if (!max || amt > max.amount) {
      return { description: tx.description || tx.category?.name || "Pemasukan", amount: amt };
    }
    return max;
  }, null as { description: string; amount: number } | null);

  // 2. Build 6-Month Monthly Trend
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    monthlyMap.set(formatMonthLabel(d), 0);
  }

  for (const tx of allIncome) {
    const txDate = new Date(tx.date);
    if (txDate >= sixMonthsAgo) {
      const key = formatMonthLabel(txDate);
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, monthlyMap.get(key)! + Number(tx.amount));
      }
    }
  }

  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Average Monthly Income — divides by months that actually have data
  // so a brand new user doesn't see "rata-rata" diluted by trailing zeros.
  const monthsWithData = monthlyTrend.filter((m) => m.amount > 0).length;
  const averageMonthly =
    monthsWithData > 0
      ? monthlyTrend.reduce((sum, item) => sum + item.amount, 0) / monthsWithData
      : 0;

  // 3. Build Category Breakdown
  const categoryMap = new Map<string, { amount: number; icon: string | null }>();
  let totalIncomeAmount = 0;

  for (const tx of allIncome) {
    const amt = Number(tx.amount);
    totalIncomeAmount += amt;
    const catName = tx.category?.name || "Tanpa Kategori";
    const catIcon = tx.category?.icon || "📂";

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { amount: 0, icon: catIcon });
    }
    categoryMap.get(catName)!.amount += amt;
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percent: totalIncomeAmount > 0 ? (data.amount / totalIncomeAmount) * 100 : 0,
      icon: data.icon,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 4. Map serializable Transaction Rows
  const transactions = allIncome.slice(0, 15).map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    date: tx.date.toISOString(),
    description: tx.description,
    accountName: tx.account.name,
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
  }));

  return (
    <IncomeClient
      transactions={transactions}
      monthlyTrend={monthlyTrend}
      categoryBreakdown={categoryBreakdown}
      currentMonthTotal={currentMonthTotal}
      monthlyDelta={monthlyDelta}
      averageMonthly={averageMonthly}
      maxIncome={maxIncomeTx}
    />
  );
}
