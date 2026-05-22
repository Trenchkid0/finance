import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TransactionsClient,
  type TransactionRowData,
} from "@/components/transactions/TransactionsClient";
import type {
  AccountOption,
  CategoryOption,
} from "@/components/transactions/TransactionForm";

/**
 * Transactions page — Server Component.
 *
 * Fetches transactions, account options, and category options in a
 * single round trip and hands them off to the interactive client shell.
 */
export default async function TransactionsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [rows, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { name: true } },
        transferTo: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.financeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true, type: true, icon: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  // Decimal → number happens here so the Client shell receives plain JSON.
  const transactions: TransactionRowData[] = rows.map((tx) => ({
    id: tx.id,
    type: tx.type,
    accountId: tx.accountId,
    accountName: tx.account.name,
    categoryId: tx.categoryId,
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
    transferToId: tx.transferToId,
    transferToName: tx.transferTo?.name ?? null,
    amount: Number(tx.amount),
    date: tx.date.toISOString(),
    description: tx.description,
    note: tx.note,
  }));

  const accountOptions: AccountOption[] = accounts;
  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
  }));

  return (
    <TransactionsClient
      transactions={transactions}
      accounts={accountOptions}
      categories={categoryOptions}
    />
  );
}
