"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Calendar, Inbox, LineChart, TrendingUp } from "lucide-react";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/StatCard";

interface IncomeTransaction {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  accountName: string;
  categoryName: string | null;
  categoryIcon: string | null;
}

interface MonthlyTrend {
  month: string;
  amount: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percent: number;
  icon: string | null;
}

interface Props {
  transactions: IncomeTransaction[];
  monthlyTrend: MonthlyTrend[];
  categoryBreakdown: CategoryBreakdown[];
  currentMonthTotal: number;
  /** Period-over-period ratio vs last full month (undefined if 0). */
  monthlyDelta?: number;
  averageMonthly: number;
  maxIncome: { description: string; amount: number } | null;
}

export function IncomeClient({
  transactions,
  monthlyTrend,
  categoryBreakdown,
  currentMonthTotal,
  monthlyDelta,
  averageMonthly,
  maxIncome,
}: Props) {
  const hasTrend =
    monthlyTrend.length > 0 && monthlyTrend.some((t) => t.amount > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-foreground mb-1">
          Analisis Pemasukan
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau tren, sumber pendapatan, dan performa keuangan bulanan Anda.
        </p>
      </header>

      {/* KPI grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Bulan ini"
          amount={currentMonthTotal}
          delta={monthlyDelta}
          tone="income"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Rata-rata bulanan"
          amount={averageMonthly}
          icon={<Calendar size={16} />}
        />
        <StatCard
          label="Sumber terbesar"
          amount={maxIncome?.description ?? "Belum ada data"}
          tone="income"
          icon={<Award size={16} />}
          trendDescription={
            maxIncome ? formatIDR(maxIncome.amount) : undefined
          }
        />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-base font-medium text-foreground mb-4">
            Tren pemasukan bulanan
          </h2>
          <div className="h-64">
            {!hasTrend ? (
              <EmptyState
                icon={LineChart}
                title="Belum cukup data"
                description="Tambahkan transaksi pemasukan untuk melihat tren bulanan."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrend}
                  margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeTrendGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2EA043" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#2EA043" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#30363D"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#8B949E"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#8B949E"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      formatIDR(v, { compact: true })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1C2128",
                      border: "1px solid #30363D",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#F0F6FC" }}
                    formatter={(v: number) => [formatIDR(v), "Pemasukan"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2EA043"
                    strokeWidth={2}
                    fill="url(#incomeTrendGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <h2 className="text-base font-medium text-foreground mb-4">
            Pembagian kategori
          </h2>
          {categoryBreakdown.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Belum ada rincian"
              description="Transaksi pemasukan dengan kategori akan tampil di sini."
              size="sm"
            />
          ) : (
            <>
              <ul className="space-y-3 flex-1">
                {categoryBreakdown.slice(0, 5).map((cat) => (
                  <li key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {cat.icon ? <span aria-hidden>{cat.icon}</span> : null}
                        <span className="text-muted-foreground truncate">
                          {cat.category}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-foreground font-medium">
                        {cat.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-income rounded-full"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-4 border-t border-border pt-2">
                Menampilkan kontribusi 5 kategori pemasukan teratas.
              </p>
            </>
          )}
        </Card>
      </section>

      {/* Recent transactions */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-foreground">
            Pemasukan terbaru
          </h2>
          {transactions.length > 0 ? (
            <Link
              href="/transactions?type=income"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Lihat semua
            </Link>
          ) : null}
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Belum ada transaksi pemasukan"
            description="Catat pemasukan untuk mulai melacak performa bulanan."
            size="sm"
          />
        ) : (
          <>
            {/* Desktop: data table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="py-2.5">Tanggal</th>
                    <th className="py-2.5">Deskripsi</th>
                    <th className="py-2.5">Akun</th>
                    <th className="py-2.5 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="text-sm text-foreground hover:bg-elevated transition-colors"
                    >
                      <td className="py-3 font-mono text-xs text-muted-foreground">
                        {formatDateShort(tx.date)}
                      </td>
                      <td className="py-3 font-medium">
                        <span className="block">
                          {tx.description ||
                            tx.categoryName ||
                            "Pemasukan"}
                        </span>
                        {tx.categoryName ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {tx.categoryIcon ? (
                              <span aria-hidden>{tx.categoryIcon}</span>
                            ) : null}
                            {tx.categoryName}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {tx.accountName}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-income font-semibold">
                        +{formatIDR(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <ul className="md:hidden divide-y divide-border">
              {transactions.map((tx) => (
                <li key={tx.id} className="py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || tx.categoryName || "Pemasukan"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      {tx.categoryIcon ? (
                        <span aria-hidden>{tx.categoryIcon}</span>
                      ) : null}
                      <span className="truncate">
                        {tx.categoryName ?? "Tanpa kategori"} · {tx.accountName}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {formatDateShort(tx.date)}
                    </p>
                  </div>
                  <p className="text-sm font-mono tabular-nums text-income font-semibold whitespace-nowrap shrink-0">
                    +{formatIDR(tx.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
