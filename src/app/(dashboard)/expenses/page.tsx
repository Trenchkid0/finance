import { startOfMonth, subMonths } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMonthLabel } from "@/lib/utils/formatters";
import { ExpensesClient } from "@/components/expenses/ExpensesClient";

/**
 * Expenses Analytics Page — Server Component.
 * Fetches transactions of type 'expense' and processes statistics.
 */
export default async function ExpensesPage() {
  const session = await auth();
  const userId = session!.user.id;

  // 1. Fetch all expense transactions for calculations
  const allExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
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
  const currentMonthTotal = allExpenses
    .filter((tx) => new Date(tx.date) >= currentMonthStart)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Previous-month delta — naik di pengeluaran berarti jelek; kita
  // pass `monthlyDelta` ke client and let it decide via invertDeltaColor.
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthTotal = allExpenses
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

  // 2. Build 6-Month Monthly Trend
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    monthlyMap.set(formatMonthLabel(d), 0);
  }

  for (const tx of allExpenses) {
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

  // Average Monthly Expense — only count months with actual transactions
  // to avoid diluting the average for users with short history.
  const monthsWithData = monthlyTrend.filter((m) => m.amount > 0).length;
  const averageMonthly =
    monthsWithData > 0
      ? monthlyTrend.reduce((sum, item) => sum + item.amount, 0) / monthsWithData
      : 0;

  // 3. Build Category Breakdown
  const categoryMap = new Map<string, { amount: number; icon: string | null }>();
  let totalExpenseAmount = 0;

  for (const tx of allExpenses) {
    const amt = Number(tx.amount);
    totalExpenseAmount += amt;
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
      percent: totalExpenseAmount > 0 ? (data.amount / totalExpenseAmount) * 100 : 0,
      icon: data.icon,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Highest Spending Category
  const maxExpenseCategory =
    categoryBreakdown.length > 0
      ? {
          name: categoryBreakdown[0].category,
          amount: categoryBreakdown[0].amount,
        }
      : null;

  // 4. Map serializable Transaction Rows
  const transactions = allExpenses.slice(0, 15).map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    date: tx.date.toISOString(),
    description: tx.description,
    accountName: tx.account.name,
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
  }));

  return (
    <ExpensesClient
      transactions={transactions}
      monthlyTrend={monthlyTrend}
      categoryBreakdown={categoryBreakdown}
      currentMonthTotal={currentMonthTotal}
      monthlyDelta={monthlyDelta}
      averageMonthly={averageMonthly}
      maxExpenseCategory={maxExpenseCategory}
    />
  );
}
