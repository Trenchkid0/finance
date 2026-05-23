import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatIDR, formatPercent } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * KPI card — shadcn dashboard-01 SectionCards pattern, retuned for IDR.
 *
 * Single component used across dashboard + analytics pages so KPI
 * styling stays identical everywhere. Three render modes via props:
 *
 *   - Default:          label + amount
 *   - Default + delta:  adds Badge with TrendingUp/Down + percent
 *   - Default + footer: adds trend label + description below the body
 *
 * `tone` colours the amount; `invertDeltaColor` flips the badge palette
 * for metrics where "up" is bad (expense, debt). `showSign` formats the
 * amount with explicit ± so net cash-flow reads at a glance.
 */
export interface StatCardProps {
  label: string;
  /** Numeric value or pre-formatted display string (for non-currency stats). */
  amount: number | string;
  /** Period-over-period delta as a ratio (0.024 = +2.4%). */
  delta?: number;
  /** Visual tone for the amount value. */
  tone?: "income" | "expense" | "neutral";
  /** Prepend +/- to the amount for net cash-flow style metrics. */
  showSign?: boolean;
  /** Flip delta color logic (positive delta = bad → red). */
  invertDeltaColor?: boolean;
  /** Optional icon slot (rendered in CardAction when no delta is shown). */
  icon?: React.ReactNode;
  /** Footer headline (one short line). */
  trendLabel?: string;
  /** Footer sub-text (muted, one short line). */
  trendDescription?: string;
}

export function StatCard({
  label,
  amount,
  delta,
  tone = "neutral",
  showSign = false,
  invertDeltaColor = false,
  icon,
  trendLabel,
  trendDescription,
}: StatCardProps) {
  const valueColor = {
    income: "text-income",
    expense: "text-expense",
    neutral: "text-foreground",
  }[tone];

  // Numeric path: format magnitude + render sign separately so
  // negatives become "-Rp 1.250.000" instead of "Rp -1.250.000".
  // String path: caller already formatted (e.g. "Belum ada data").
  const isNumeric = typeof amount === "number";
  const magnitude = isNumeric ? formatIDR(Math.abs(amount)) : amount;
  const signPrefix = showSign && isNumeric ? (amount >= 0 ? "+" : "-") : "";

  // For income: positive delta is good (income green).
  // For expense: positive delta is bad (red) when invertDeltaColor=true.
  const hasDelta = typeof delta === "number";
  const deltaIsPositiveSign = hasDelta && delta >= 0;
  const deltaIsGood = hasDelta
    ? invertDeltaColor
      ? !deltaIsPositiveSign
      : deltaIsPositiveSign
    : false;

  const TrendIcon = deltaIsPositiveSign ? TrendingUp : TrendingDown;

  const showFooter = !!trendLabel || !!trendDescription;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl @[200px]/card:text-3xl font-semibold font-mono tabular-nums",
            valueColor,
            // Non-currency string values get a smaller size since they
            // can be longer (e.g. "Belum ada data" or category names).
            !isNumeric && "text-base @[200px]/card:text-lg font-medium",
          )}
        >
          {signPrefix}
          {magnitude}
        </CardTitle>
        {hasDelta ? (
          <CardAction>
            <Badge variant={deltaIsGood ? "income" : "expense"}>
              <TrendIcon size={12} />
              {deltaIsPositiveSign ? "+" : ""}
              {formatPercent(delta!)}
            </Badge>
          </CardAction>
        ) : icon ? (
          <CardAction>
            <span className="text-muted-foreground" aria-hidden>
              {icon}
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      {showFooter ? (
        <CardFooter className="flex-col items-start gap-1.5 text-xs pt-0">
          {trendLabel ? (
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              {trendLabel}
              {hasDelta ? <TrendIcon size={12} /> : null}
            </div>
          ) : null}
          {trendDescription ? (
            <div className="text-muted-foreground">{trendDescription}</div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
