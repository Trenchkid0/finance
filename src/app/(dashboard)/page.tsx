import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NetWorthHero, type NetWorthPoint, type NetWorthPeriod } from "@/components/dashboard/NetWorthHero";
import { OnboardingHero } from "@/components/dashboard/OnboardingHero";
import {
  BalanceSheet,
  type BalanceGroup,
  type BalanceAccount,
} from "@/components/dashboard/BalanceSheet";
import { CashflowSankey, type SankeyDatum } from "@/components/charts/CashflowSankey";
import {
  RecentTransactions,
  type RecentTransactionItem,
} from "@/components/dashboard/RecentTransactions";

/**
 * Dashboard overview — Server Component (Maybe-Finance-style).
 *
 * Layout (atas → bawah):
 *   1. Net worth hero (chart + period selector)
 *   2. Balance sheet (Aset + Liabilitas, side-by-side)
 *   3. Cashflow sankey (inflow → cashflow node → outflow + surplus)
 *   4. Recent transactions
 *
 * Period & cashflow_period diturunkan dari URL search params supaya bisa
 * di-bookmark / share. Default 30 hari (30d).
 */

type SearchParams = Promise<{
  period?: string;
  cashflow_period?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;

  const period = parsePeriod(params.period) ?? "30d";
  const cashflowPeriod = parsePeriod(params.cashflow_period) ?? "30d";

  const userName =
    session!.user.name?.trim().split(" ")[0] ??
    session!.user.email?.split("@")[0] ??
    "kamu";

  // First-time user — belum punya akun aktif. Tampilkan onboarding
  // dulu sebelum dashboard "kosong" yang membingungkan.
  const accountsCount = await prisma.financeAccount.count({
    where: { userId, isActive: true },
  });

  if (accountsCount === 0) {
    return <OnboardingHero userName={capitalize(userName)} />;
  }

  const [
    accounts,
    netWorthSeries,
    cashflow,
    recent,
  ] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true, balance: true },
      orderBy: { createdAt: "asc" },
    }),
    getNetWorthSeries(userId, period),
    getCashflow(userId, cashflowPeriod),
    getRecentTransactions(userId, 8),
  ]);

  const netWorthCurrent = accounts.reduce(
    (sum, a) => sum + Number(a.balance),
    0,
  );
  const netWorthPrevious =
    netWorthSeries.length > 0 ? netWorthSeries[0].value : netWorthCurrent;

  // Bangun balance sheet groups dari akun aktif. Untuk MVP semua akun
  // dianggap aset (skema kita belum punya credit/loan account type).
  const assetGroups = buildAssetGroups(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
    })),
    netWorthCurrent,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
          Selamat datang kembali, {capitalize(userName)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Berikut ringkasan keuangan Anda saat ini.
        </p>
      </header>

      <NetWorthHero
        current={netWorthCurrent}
        previous={netWorthPrevious}
        period={period}
        series={netWorthSeries}
      />

      <BalanceSheet
        assets={{
          title: "Assets",
          total: netWorthCurrent,
          groups: assetGroups,
        }}
        liabilities={{
          title: "Liabilities",
          total: 0,
          groups: [],
        }}
      />

      <CashflowSankey data={cashflow} period={cashflowPeriod} />

      <RecentTransactions transactions={recent} />
    </div>
  );
}

// --- Period helpers ------------------------------------------------------

function parsePeriod(raw: string | undefined): NetWorthPeriod | null {
  if (!raw) return null;
  const allowed: NetWorthPeriod[] = [
    "1d",
    "7d",
    "30d",
    "90d",
    "ytd",
    "365d",
    "5y",
  ];
  return (allowed as string[]).includes(raw) ? (raw as NetWorthPeriod) : null;
}

function periodToRange(period: NetWorthPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(end);

  switch (period) {
    case "1d":
      start.setDate(end.getDate() - 1);
      break;
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "ytd":
      start.setMonth(0, 1);
      break;
    case "365d":
      start.setDate(end.getDate() - 365);
      break;
    case "5y":
      start.setFullYear(end.getFullYear() - 5);
      break;
  }
  return { start, end };
}

// --- Net worth series ----------------------------------------------------

/**
 * Net worth time-series — backwards-rolling dari saldo saat ini.
 *
 * Algoritma:
 *   1. Fetch semua transaksi dalam rentang `period`.
 *   2. Hitung delta saldo per hari (untuk setiap akun aktif).
 *   3. Rolling backwards dari saldo saat ini supaya tahu net worth
 *      pada awal setiap hari.
 *
 * Sederhana tapi cukup untuk MVP. Kalau akun banyak / window panjang,
 * pakai materialized view atau pre-aggregated daily snapshot.
 */
async function getNetWorthSeries(
  userId: string,
  period: NetWorthPeriod,
): Promise<NetWorthPoint[]> {
  const { start, end } = periodToRange(period);

  const [accounts, txs] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      select: {
        type: true,
        amount: true,
        date: true,
        accountId: true,
        transferToId: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const currentNetWorth = accounts.reduce(
    (sum, a) => sum + Number(a.balance),
    0,
  );

  // Build daily delta map (key = YYYY-MM-DD).
  const deltaByDay = new Map<string, number>();
  for (const tx of txs) {
    const key = isoDay(tx.date);
    const amt = Number(tx.amount);
    let delta = 0;
    if (tx.type === "income") delta = amt;
    else if (tx.type === "expense") delta = -amt;
    // Transfer tidak mengubah net worth (uang pindah antar akun user).
    deltaByDay.set(key, (deltaByDay.get(key) ?? 0) + delta);
  }

  // Generate daily points dari `start` ke `end` (exclusive).
  const points: NetWorthPoint[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    points.push({ date: isoDay(cursor), value: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Rolling backwards: nilai akhir = currentNetWorth, kurangi delta
  // hari berikutnya untuk dapat nilai hari ini.
  if (points.length > 0) {
    points[points.length - 1].value = currentNetWorth;
    for (let i = points.length - 2; i >= 0; i--) {
      const nextDay = points[i + 1].date;
      const nextDelta = deltaByDay.get(nextDay) ?? 0;
      points[i].value = points[i + 1].value - nextDelta;
    }
  }

  return points;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// --- Cashflow ------------------------------------------------------------

async function getCashflow(userId: string, period: NetWorthPeriod) {
  const { start, end } = periodToRange(period);

  const grouped = await prisma.transaction.groupBy({
    by: ["type", "categoryId"],
    where: {
      userId,
      type: { in: ["income", "expense"] },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  const categoryIds = grouped
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true },
      })
    : [];
  const meta = new Map(categories.map((c) => [c.id, c]));

  const inflow: SankeyDatum[] = [];
  const outflow: SankeyDatum[] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (const g of grouped) {
    const amount = Number(g._sum.amount ?? 0);
    if (amount <= 0) continue;
    const cat = g.categoryId ? meta.get(g.categoryId) : null;
    const datum: SankeyDatum = {
      name: cat?.name ?? (g.type === "income" ? "Pemasukan" : "Lainnya"),
      side: g.type === "income" ? "source" : "target",
      value: amount,
      color:
        cat?.color ??
        (g.type === "income" ? "#2EA043" : "#F85149"),
    };
    if (g.type === "income") {
      inflow.push(datum);
      totalIn += amount;
    } else {
      outflow.push(datum);
      totalOut += amount;
    }
  }

  // Sort biggest first untuk layout yang nyaman dibaca.
  inflow.sort((a, b) => b.value - a.value);
  outflow.sort((a, b) => b.value - a.value);

  const surplus = Math.max(0, totalIn - totalOut);

  return {
    total: totalIn,
    inflow,
    outflow,
    surplus,
  };
}

// --- Balance sheet groups ------------------------------------------------

// Palette biru bertingkat — paling kuat untuk Bank (porsi terbesar
// biasanya), shade lebih lembut untuk Cash & Investment.
const ASSET_GROUP_COLOR: Record<string, string> = {
  cash: "#79B8FF",
  wallet: "#79B8FF",
  bank: "#388BFD",
  investment: "#1F6FEB",
};

const ASSET_GROUP_LABEL: Record<string, string> = {
  cash: "Tunai",
  wallet: "E-wallet",
  bank: "Bank",
  investment: "Investasi",
};

function buildAssetGroups(
  rows: { id: string; name: string; type: string; balance: number }[],
  totalNet: number,
): BalanceGroup[] {
  // Kelompokkan berdasarkan tipe akun. Tunai + E-wallet kita gabung jadi
  // "Cash" supaya konsisten dengan referensi (cash + e-wallet sama-sama
  // likuid harian).
  const buckets = new Map<string, BalanceAccount[]>();
  const totals = new Map<string, number>();

  for (const r of rows) {
    if (r.balance === 0) continue;
    // Kelompokkan: bank → "Bank", investment → "Investasi", lainnya → "Cash"
    const groupKey =
      r.type === "investment" ? "investment" : r.type === "bank" ? "bank" : "cash";
    const acc: BalanceAccount = {
      id: r.id,
      name: r.name,
      value: r.balance,
      percent: totalNet > 0 ? (r.balance / totalNet) * 100 : 0,
      initial: r.name.charAt(0).toUpperCase() || "?",
    };
    const list = buckets.get(groupKey) ?? [];
    list.push(acc);
    buckets.set(groupKey, list);
    totals.set(groupKey, (totals.get(groupKey) ?? 0) + r.balance);
  }

  const groups: BalanceGroup[] = [];
  for (const [key, accounts] of buckets) {
    const total = totals.get(key) ?? 0;
    accounts.sort((a, b) => b.value - a.value);
    groups.push({
      name:
        ASSET_GROUP_LABEL[key] ??
        key.charAt(0).toUpperCase() + key.slice(1),
      color: ASSET_GROUP_COLOR[key] ?? "#8B949E",
      total,
      percent: totalNet > 0 ? (total / totalNet) * 100 : 0,
      accounts,
    });
  }

  groups.sort((a, b) => b.total - a.total);
  return groups;
}

// --- Recent transactions -------------------------------------------------

async function getRecentTransactions(
  userId: string,
  take: number,
): Promise<RecentTransactionItem[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    include: {
      category: { select: { name: true, icon: true } },
      account: { select: { name: true } },
      transferTo: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take,
  });

  return rows.map((tx) => ({
    id: tx.id,
    description: tx.description ?? tx.category?.name ?? "Transaksi",
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
    accountName: tx.account.name,
    transferToName: tx.transferTo?.name ?? null,
    date: tx.date.toISOString(),
    amount: Number(tx.amount),
    type: tx.type as "income" | "expense" | "transfer",
  }));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
