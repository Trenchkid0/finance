"use client";

/**
 * Cash-flow chart — income vs expense over months as two lines.
 *
 * AGENTS.md §4.9:
 *  - ResponsiveContainer for fluid layout
 *  - Zero baseline (cartesian default `domain={[0, 'auto']}`)
 *  - Subtle grid (#30363D at ~50% opacity)
 *  - Y-axis labels in compact IDR ("Rp 48,2 jt")
 */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { CHART_COLORS } from "@/lib/utils/constants";
import { formatIDR } from "@/lib/utils/formatters";

interface CashFlowDatum {
  month: string;
  income: number;
  expense: number;
}

interface Props {
  data: CashFlowDatum[];
}

export function CashFlowChart({ data }: Props) {
  // Treat all-zeros as empty so we don't render flat zero-lines.
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="bg-surface border border-border rounded-lg p-6 h-full">
      <h3 className="text-base font-medium text-text-primary mb-4">Arus kas</h3>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#30363D" strokeOpacity={0.5} vertical={false} />
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
                tickFormatter={(v: number) => formatIDR(v, { compact: true })}
              />
              <Tooltip
                cursor={{ stroke: "#30363D", strokeWidth: 1 }}
                contentStyle={{
                  background: "#1C2128",
                  border: "1px solid #30363D",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#F0F6FC" }}
                formatter={(value: number, name: string) => [
                  formatIDR(value),
                  name === "income" ? "Pemasukan" : "Pengeluaran",
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "#8B949E" }}
                formatter={(value: string) =>
                  value === "income" ? "Pemasukan" : "Pengeluaran"
                }
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke={CHART_COLORS.income}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.income, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke={CHART_COLORS.expense}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.expense, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-full bg-elevated text-text-muted flex items-center justify-center mb-3">
        <LineChartIcon size={18} />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Belum cukup data
      </p>
      <p className="text-xs text-text-muted">
        Tambahkan transaksi untuk melihat tren bulanan.
      </p>
    </div>
  );
}
