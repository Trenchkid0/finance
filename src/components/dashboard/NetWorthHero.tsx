"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";

/**
 * Net worth hero — pola dashboard Maybe Finance asli.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ Net Worth                              [30D ▾]   │
 *   │ Rp 4.175.137                                     │
 *   │ ↑ Rp 231.224 (5.9%)  vs. last month              │
 *   │                                                  │
 *   │ ╱╲╱╲╱─╲                                          │
 *   │       ╲╱╲                                        │
 *   └──────────────────────────────────────────────────┘
 *
 * Period selector pakai `useSearchParams` supaya state bisa di-bookmark.
 * Chart pakai gradient split: warna hijau untuk delta positif, merah
 * untuk negatif — dihitung dari titik awal vs akhir window.
 */

export interface NetWorthPoint {
  date: string;
  value: number;
}

export type NetWorthPeriod =
  | "1d"
  | "7d"
  | "30d"
  | "90d"
  | "ytd"
  | "365d"
  | "5y";

interface Props {
  current: number;
  previous: number;
  period: NetWorthPeriod;
  series: NetWorthPoint[];
}

const PERIOD_OPTIONS: { value: NetWorthPeriod; label: string }[] = [
  { value: "1d", label: "1H" },
  { value: "7d", label: "7H" },
  { value: "30d", label: "30H" },
  { value: "90d", label: "90H" },
  { value: "ytd", label: "YTD" },
  { value: "365d", label: "365H" },
  { value: "5y", label: "5T" },
];

export function NetWorthHero({ current, previous, period, series }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [hoverPoint, setHoverPoint] = useState<NetWorthPoint | null>(null);

  function setPeriod(next: NetWorthPeriod) {
    const params = new URLSearchParams(searchParams);
    if (next === "30d") params.delete("period");
    else params.set("period", next);
    const qs = params.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname),
    );
  }

  const delta = current - previous;
  const ratio = previous === 0 ? 0 : (delta / previous) * 100;
  const dir: "up" | "down" | "flat" =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const display = hoverPoint
    ? { value: hoverPoint.value, label: formatDateShort(hoverPoint.date) }
    : { value: current, label: null };

  // Compute domain padding ke 2% supaya chart tidak hug top.
  const yDomain = useMemo<[number, number]>(() => {
    if (series.length === 0) return [0, 1];
    const values = series.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.05 || max * 0.02;
    return [min - pad, max + pad];
  }, [series]);

  const lineColor = "#388BFD"; // primary blue — konsisten dengan brand color

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 pb-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Net Worth
          </p>
          <p className="text-3xl font-semibold font-mono tabular-nums text-foreground">
            {formatIDR(display.value)}
          </p>
          <DeltaLine
            dir={dir}
            delta={delta}
            ratio={ratio}
            hoveredLabel={display.label}
          />
        </div>

        <div className="shrink-0">
          <PeriodSelect
            value={period}
            onChange={setPeriod}
            disabled={pending}
          />
        </div>
      </div>

      {/* Chart area */}
      <div className="h-52 px-1 pt-2 pb-3">
        {series.length < 2 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Belum cukup data untuk periode ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 8, right: 16, left: 16, bottom: 4 }}
              onMouseLeave={() => setHoverPoint(null)}
            >
              <defs>
                <linearGradient
                  id="netWorthFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                hide
              />
              <YAxis hide domain={yDomain} />
              <Tooltip
                cursor={{ stroke: "#30363D", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as NetWorthPoint;
                    if (
                      !hoverPoint ||
                      hoverPoint.date !== p.date
                    ) {
                      // Sync hover state untuk update angka di header.
                      // Set di setTimeout supaya tidak setState saat render.
                      queueMicrotask(() => setHoverPoint(p));
                    }
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#netWorthFill)"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(d) => formatDateShort(d as string)}
                fontSize={10}
                stroke="#8B949E"
                interval="preserveStartEnd"
                ticks={[
                  series[0].date,
                  series[series.length - 1].date,
                ]}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function DeltaLine({
  dir,
  delta,
  ratio,
  hoveredLabel,
}: {
  dir: "up" | "down" | "flat";
  delta: number;
  ratio: number;
  hoveredLabel: string | null;
}) {
  const colorClass =
    dir === "up"
      ? "text-income"
      : dir === "down"
        ? "text-expense"
        : "text-muted-foreground";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;

  return (
    <p className={`text-sm font-mono tabular-nums ${colorClass}`}>
      {delta >= 0 ? "+" : ""}
      {formatIDR(delta)}
      <span className="ml-2 inline-flex items-center gap-0.5">
        <Icon size={12} />
        {Math.abs(ratio).toFixed(1)}%
      </span>
      <span className="ml-2 text-muted-foreground font-sans">
        {hoveredLabel ? `pada ${hoveredLabel}` : "vs periode sebelumnya"}
      </span>
    </p>
  );
}

function PeriodSelect({
  value,
  onChange,
  disabled,
}: {
  value: NetWorthPeriod;
  onChange: (v: NetWorthPeriod) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as NetWorthPeriod)}
      disabled={disabled}
      className="bg-elevated border border-border text-foreground text-xs font-medium rounded-md px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/50 hover:border-[#444C56] transition-colors disabled:opacity-50"
      aria-label="Periode"
    >
      {PERIOD_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
