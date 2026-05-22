"use client";

import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatIDR, formatPercent } from "@/lib/utils/formatters";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/**
 * Hero net-worth card. Bigger type per §4.3 "display" token.
 * Displays a clean micro-sparkline of historical trends if history is provided.
 */
interface NetWorthCardProps {
  amount: number;
  /** Ratio delta vs previous period. */
  delta?: number;
  /** Historical net worth trend data. */
  history?: { month: string; value: number }[];
}

export function NetWorthCard({ amount, delta, history }: NetWorthCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 transition-all duration-200 hover:border-[#444C56] md:col-span-2 xl:col-span-1 flex flex-col justify-between min-h-[160px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-text-muted font-medium">
            Kekayaan bersih
          </p>
          <span className="text-text-muted" aria-hidden>
            <Wallet size={16} />
          </span>
        </div>

        <p className="text-3xl font-semibold font-mono tabular-nums text-text-primary">
          {formatIDR(amount)}
        </p>

        {typeof delta === "number" ? (
          <p
            className={cn(
              "mt-2 text-xs font-mono tabular-nums",
              delta >= 0 ? "text-income" : "text-expense",
            )}
          >
            {delta >= 0 ? "+" : "-"}
            {formatPercent(Math.abs(delta))}
            <span className="text-text-muted ml-1 font-normal">vs bulan lalu</span>
          </p>
        ) : null}
      </div>

      {history && history.length > 0 ? (
        <div className="h-10 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="networthSparkline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#388BFD" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#388BFD" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#388BFD"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#networthSparkline)"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
