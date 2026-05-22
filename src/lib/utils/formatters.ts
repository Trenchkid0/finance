/**
 * Currency, date, and percentage formatters — Indonesian locale.
 * AGENTS.md §5.4.
 */

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface FormatIDROptions {
  /** Abbreviate large numbers (e.g. "Rp 48,2 jt", "Rp 1,3 M"). */
  compact?: boolean;
  /** Force +/- sign even for positives. Useful for deltas. */
  signed?: boolean;
}

/**
 * Format a number as Indonesian Rupiah.
 *
 * @example
 *   formatIDR(48_250_000)                  // "Rp 48.250.000"
 *   formatIDR(48_200_000, { compact: true }) // "Rp 48,2 jt"
 *   formatIDR(1_125_000, { signed: true })   // "+Rp 1.125.000"
 */
export function formatIDR(amount: number, options: FormatIDROptions = {}): string {
  const { compact, signed } = options;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : signed ? "+" : "";

  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}Rp ${formatCompactNumber(abs / 1_000_000_000)} M`;
    }
    if (abs >= 1_000_000) {
      return `${sign}Rp ${formatCompactNumber(abs / 1_000_000)} jt`;
    }
    if (abs >= 1_000) {
      return `${sign}Rp ${formatCompactNumber(abs / 1_000)} rb`;
    }
  }

  // Strip the formatter's own sign so we can re-apply our `signed` rule.
  const formatted = IDR.format(abs);
  return `${sign}${formatted}`;
}

function formatCompactNumber(value: number): string {
  // 1 decimal place, Indonesian decimal separator (",").
  return value.toFixed(1).replace(".", ",");
}

/** Format a percentage. `formatPercent(0.024)` → "2,4%". */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Short date like "22 Mei 2026". */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Compact relative date for transaction rows: "22 Mei". */
export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}
