import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatIDR, formatPercent } from "@/lib/utils/formatters";

/**
 * KPI card — AGENTS.md §4.5 "Stat Cards (KPI)".
 *
 * - Numbers use `font-mono tabular-nums` (§4.3 critical rule).
 * - Delta colored by direction (income/expense palette per §4.2).
 * - No shadows, border-only (§4.5).
 */
export interface StatCardProps {
  label: string;
  amount: number;
  /**
   * Period-over-period delta as a ratio (0.024 = +2.4%). Optional.
   * When `undefined`, the delta line isn't rendered.
   */
  delta?: number;
  /** Visual tone for the value. Defaults to neutral text-primary. */
  tone?: "income" | "expense" | "neutral";
  icon?: React.ReactNode;
  /**
   * When true, prefix the formatted amount with `+` for non-negative
   * and `-` for negative values. Useful for net cash-flow style
   * metrics where the sign carries the meaning.
   */
  showSign?: boolean;
  /**
   * Flip the delta color logic. Default: positive delta = green (good).
   * For expense KPIs, set this to `true` so a positive delta — i.e.
   * pengeluaran NAIK — renders red, and a negative delta renders green.
   */
  invertDeltaColor?: boolean;
}

export function StatCard({
  label,
  amount,
  delta,
  tone = "neutral",
  icon,
  showSign = false,
  invertDeltaColor = false,
}: StatCardProps) {
  const valueColor = {
    income: "text-income",
    expense: "text-expense",
    neutral: "text-text-primary",
  }[tone];

  // Always format the magnitude; sign is rendered explicitly so
  // negatives show as "-Rp 1.250.000" rather than "Rp -1.250.000".
  const magnitude = formatIDR(Math.abs(amount));
  const signPrefix = showSign ? (amount >= 0 ? "+" : "-") : "";

  // For income: positive delta is good (green).
  // For expense: positive delta is bad (red) — flip with invertDeltaColor.
  const deltaIsGood =
    typeof delta === "number"
      ? invertDeltaColor
        ? delta < 0
        : delta >= 0
      : false;

  return (
    <div className="bg-surface border border-border rounded-lg p-6 transition-all duration-200 hover:border-[#444C56]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          {label}
        </p>
        {icon ? (
          <span className="text-text-muted" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>

      <p className={cn("text-2xl font-semibold font-mono tabular-nums", valueColor)}>
        {signPrefix}
        {magnitude}
      </p>

      {typeof delta === "number" ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-mono tabular-nums",
            deltaIsGood ? "text-income" : "text-expense",
          )}
        >
          {delta >= 0 ? (
            <ArrowUpRight size={12} />
          ) : (
            <ArrowDownRight size={12} />
          )}
          {formatPercent(Math.abs(delta))}
          <span className="text-text-muted ml-1">vs bulan lalu</span>
        </p>
      ) : null}
    </div>
  );
}
