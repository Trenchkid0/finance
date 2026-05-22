"use client";

/**
 * Expense distribution by category — Recharts donut.
 * Tooltip shows formatted IDR + percentage of total (§4.9).
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { CHART_COLORS } from "@/lib/utils/constants";
import { formatIDR, formatPercent } from "@/lib/utils/formatters";

interface ExpenseSlice {
  category: string;
  amount: number;
}

interface Props {
  data: ExpenseSlice[];
}

export function ExpensePieChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const hasData = total > 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-6 h-full flex flex-col">
      <h3 className="text-base font-medium text-text-primary mb-4">
        Pengeluaran per kategori
      </h3>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS.categories[idx % CHART_COLORS.categories.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1C2128",
                    border: "1px solid #30363D",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#F0F6FC" }}
                  formatter={(value: number, name: string) => [
                    `${formatIDR(value)} (${formatPercent(value / total)})`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Compact legend — top 5 categories. Uses tabular-nums (§4.3). */}
          <ul className="mt-4 space-y-1.5 text-xs">
            {data.slice(0, 5).map((d, idx) => (
              <li key={d.category} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      CHART_COLORS.categories[idx % CHART_COLORS.categories.length],
                  }}
                  aria-hidden
                />
                <span className="flex-1 text-text-muted truncate">
                  {d.category}
                </span>
                <span className="font-mono tabular-nums text-text-primary">
                  {formatIDR(d.amount, { compact: true })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 min-h-48 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-full bg-elevated text-text-muted flex items-center justify-center mb-3">
        <PieIcon size={18} />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Belum ada pengeluaran
      </p>
      <p className="text-xs text-text-muted">
        Catat pengeluaran bulan ini untuk melihat distribusi.
      </p>
    </div>
  );
}
