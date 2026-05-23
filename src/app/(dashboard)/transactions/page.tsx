import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAIScanEnabled } from "@/lib/flags";
import {
  TransactionsClient,
  type TransactionRowData,
} from "@/components/transactions/TransactionsClient";
import type {
  AccountOption,
  CategoryOption,
} from "@/components/transactions/TransactionForm";

/**
 * Transactions page — Server Component with URL-driven filters.
 *
 * Filter & paging strategy:
 *  - URL search params are the source of truth so links and refresh
 *    keep state. Client-side filtering only applies to the search box
 *    (debounced cheaply via `defaultValue` + form submit).
 *  - Fetch is paged at the DB layer (10/25/50 per page) — we never
 *    pull the whole table into memory just to paginate it client-side.
 *  - `Promise.all` does the rows + total count + lookup data in one
 *    round trip so the UI renders in a single waterfall.
 */

type SearchParams = Promise<{
  q?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
}>;

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const params = await searchParams;
  const filters = parseFilters(params);

  const where = buildWhere(userId, filters);

  const [rows, total, summary, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { name: true } },
        transferTo: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.transaction.count({ where }),
    // Aggregate income vs expense untuk seluruh hasil filter (bukan
    // halaman saja) — supaya kartu summary di header refleksif terhadap
    // filter aktif.
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
    prisma.financeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true, type: true, icon: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const s of summary) {
    if (s.type === "income") totalIncome = Number(s._sum.amount ?? 0);
    else if (s.type === "expense") totalExpense = Number(s._sum.amount ?? 0);
  }

  const transactions: TransactionRowData[] = rows.map((tx) => ({
    id: tx.id,
    type: tx.type as "income" | "expense" | "transfer",
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
    type: c.type as "income" | "expense",
    icon: c.icon,
  }));

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <TransactionsClient
      transactions={transactions}
      accounts={accountOptions}
      categories={categoryOptions}
      filters={{
        q: filters.q,
        type: filters.type,
        accountId: filters.accountId,
        categoryId: filters.categoryId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }}
      pagination={{
        page: filters.page,
        pageSize: filters.pageSize,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        total,
        totalPages,
      }}
      summary={{
        total,
        income: totalIncome,
        expense: totalExpense,
      }}
      aiScanEnabled={isAIScanEnabled()}
    />
  );
}

// --- Helpers -------------------------------------------------------------

interface ParsedFilters {
  q: string;
  type: "all" | "income" | "expense" | "transfer";
  accountId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
}

function parseFilters(
  params: Awaited<SearchParams>,
): ParsedFilters {
  const allowedTypes = new Set(["income", "expense", "transfer"]);

  const type =
    params.type && allowedTypes.has(params.type)
      ? (params.type as "income" | "expense" | "transfer")
      : "all";

  const pageNum = Number(params.page ?? "1");
  const sizeNum = Number(params.pageSize ?? String(PAGE_SIZE_DEFAULT));

  return {
    q: (params.q ?? "").trim(),
    type,
    accountId: params.accountId ?? "all",
    categoryId: params.categoryId ?? "all",
    startDate: isValidISODate(params.startDate) ? params.startDate! : "",
    endDate: isValidISODate(params.endDate) ? params.endDate! : "",
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(sizeNum) ? sizeNum : PAGE_SIZE_DEFAULT,
  };
}

function isValidISODate(value: string | undefined): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function buildWhere(
  userId: string,
  f: ParsedFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  if (f.type !== "all") {
    where.type = f.type;
  }

  if (f.accountId !== "all") {
    // Account filter matches either source or transfer destination so
    // a user filtering by "BCA" sees both outgoing transfers and
    // incoming transfers without quirky UI.
    where.OR = [
      { accountId: f.accountId },
      { transferToId: f.accountId },
    ];
  }

  if (f.categoryId !== "all") {
    where.categoryId = f.categoryId === "none" ? null : f.categoryId;
  }

  if (f.q.length > 0) {
    // Plain `contains` — MySQL collation in our seed is case-insensitive
    // by default. If the project ever switches to a binary collation
    // we'll need `mode: 'insensitive'` here (Postgres only).
    const insensitive: Prisma.StringNullableFilter = { contains: f.q };
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { description: insensitive },
          { note: insensitive },
        ],
      },
    ];
  }

  // Date range — endDate inclusive, jadi kita pakai start of next day.
  if (f.startDate || f.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (f.startDate) {
      dateFilter.gte = new Date(`${f.startDate}T00:00:00`);
    }
    if (f.endDate) {
      const end = new Date(`${f.endDate}T00:00:00`);
      end.setDate(end.getDate() + 1);
      dateFilter.lt = end;
    }
    where.date = dateFilter;
  }

  return where;
}
