import type { NextRequest } from "next/server";
import { startOfMonth, subMonths } from "date-fns";
import { authenticateApi, okResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/summary
 * Snapshot keuangan untuk widget bot:
 *   - netWorth (saldo total semua akun aktif)
 *   - currentMonth.income / expense / net
 *   - previousMonth.income / expense / net
 *   - topExpenseCategories (5 teratas bulan ini)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const userId = auth.userId;
  const now = new Date();
  const currentStart = startOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));

  const [netWorth, currentTxs, previousTxs, topCategoriesGroup] =
    await Promise.all([
      prisma.financeAccount
        .findMany({
          where: { userId, isActive: true },
          select: { balance: true },
        })
        .then((rows) => rows.reduce((s, r) => s + Number(r.balance), 0)),

      prisma.transaction.findMany({
        where: { userId, date: { gte: currentStart } },
        select: { type: true, amount: true },
      }),

      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: previousStart, lt: currentStart },
        },
        select: { type: true, amount: true },
      }),

      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: "expense", date: { gte: currentStart } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
    ]);

  function aggregate(rows: { type: string; amount: { toString(): string } }[]) {
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.type === "income") income += amt;
      else if (r.type === "expense") expense += amt;
    }
    return { income, expense, net: income - expense };
  }

  const current = aggregate(currentTxs);
  const previous = aggregate(previousTxs);

  // Resolve category names
  const categoryIds = topCategoriesGroup
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      })
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const topExpenseCategories = topCategoriesGroup.map((g) => ({
    categoryId: g.categoryId,
    name: g.categoryId
      ? categoryMap.get(g.categoryId)?.name ?? "Tanpa kategori"
      : "Tanpa kategori",
    icon: g.categoryId ? categoryMap.get(g.categoryId)?.icon ?? null : null,
    amount: Number(g._sum.amount ?? 0),
  }));

  return okResponse({
    netWorth,
    currentMonth: {
      start: currentStart.toISOString(),
      ...current,
    },
    previousMonth: {
      start: previousStart.toISOString(),
      ...previous,
    },
    topExpenseCategories,
  });
}
