"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { setBudgetLimit } from "@/app/actions/budgets";
import { cn } from "@/lib/utils/cn";
import { formatIDR } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Budget page — pola Maybe Finance asli, retuned ke palette biru.
 *
 * Layout:
 *  ┌─ Picker bulan (◀ May 2026 ▼ ▶) ───────── Today ┐
 *  │  ┌───── Donut chart (300px) ──┐ ┌─ Tabs ─────┐ │
 *  │  │ Spent Rp1.027.757          │ │ Budgeted   │ │
 *  │  │ of   Rp5.000.000           │ │ Actual     │ │
 *  │  └────────────────────────────┘ └────────────┘ │
 *  │  ┌─ Categories list ─────────────────────────┐ │
 *  │  │ ⓢ Shopping       290k spent  / 0    over  │ │
 *  │  │ ⓕ Food           108k spent  / 200k       │ │
 *  │  └───────────────────────────────────────────┘ │
 *  └────────────────────────────────────────────────┘
 *
 * Tetap pakai chart palette biru — donut category pakai shade biru
 * bertingkat untuk visual yang konsisten dengan dashboard.
 */

export interface BudgetCategoryData {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  spent: number;
  limit: number | null;
}

interface Props {
  monthLabel: string;
  year: number;
  /** 1..12 */
  month: number;
  yearOptions: number[];
  isCurrentMonth: boolean;
  categories: BudgetCategoryData[];
  totalSpent: number;
  uncategorizedSpent: number;
  monthlyIncome: number;
}

// Palette biru bertingkat untuk donut segments. Sengaja konsisten
// dengan dashboard supaya user tidak bingung "kenapa kategori X di
// dashboard biru muda tapi di budget biru tua".
const BLUE_PALETTE = [
  "#388BFD",
  "#1F6FEB",
  "#79B8FF",
  "#1158C7",
  "#5896FF",
  "#0D419D",
  "#A2C8FF",
  "#C8DDFF",
];

export function BudgetClient({
  monthLabel,
  year,
  month,
  yearOptions,
  isCurrentMonth,
  categories,
  totalSpent,
  uncategorizedSpent,
  monthlyIncome,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const totalBudget = categories.reduce(
    (sum, c) => sum + (c.limit ?? 0),
    0,
  );
  const remaining = totalBudget - totalSpent;
  const utilization =
    totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  // Assign blue shade ke setiap kategori berdasarkan posisi (urutan
  // sudah server-sorted: aktif dulu).
  const categoriesWithColor = categories.map((cat, i) => ({
    ...cat,
    color: BLUE_PALETTE[i % BLUE_PALETTE.length],
  }));

  function navigateToMonth(targetYear: number, targetMonth: number) {
    const ym = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    startTransition(() => router.push(`${pathname}?month=${ym}`));
  }

  // Helper untuk previous / next month.
  function shiftMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m === 0) {
      m = 12;
      y -= 1;
    } else if (m === 13) {
      m = 1;
      y += 1;
    }
    navigateToMonth(y, m);
  }

  // Keyboard shortcut: panah kiri/kanan untuk geser bulan. Skip kalau
  // user sedang fokus di input (mis. edit limit budget) atau pakai
  // modifier (Cmd+arrow → browser navigation).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        shiftMonth(-1);
      } else if (e.key === "ArrowRight") {
        // Cegah maju ke masa depan.
        const now = new Date();
        if (year === now.getFullYear() && month >= now.getMonth() + 1) return;
        e.preventDefault();
        shiftMonth(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // shiftMonth sengaja tidak di-deps — closure-nya capture year/month
    // terbaru via re-render. Pakai eslint-disable supaya konsisten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  return (
    <div className="space-y-6">
      <MonthPicker
        monthLabel={monthLabel}
        year={year}
        month={month}
        yearOptions={yearOptions}
        isCurrentMonth={isCurrentMonth}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onPick={navigateToMonth}
        onJumpToday={() => {
          const now = new Date();
          navigateToMonth(now.getFullYear(), now.getMonth() + 1);
        }}
        pending={pending}
      />

      <div className="flex flex-col items-stretch gap-4 md:flex-row">
        {/* Left column — Donut + Tabs */}
        <div className="w-full md:max-w-[300px] space-y-4">
          <BudgetDonut
            spent={totalSpent}
            budget={totalBudget}
            categories={categoriesWithColor}
          />
          <BudgetSummaryTabs
            spent={totalSpent}
            budget={totalBudget}
            remaining={remaining}
            utilization={utilization}
            income={monthlyIncome}
            categories={categoriesWithColor}
            uncategorizedSpent={uncategorizedSpent}
          />
        </div>

        {/* Right column — Categories */}
        <div className="w-full grow rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground">
              Kategori
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {categoriesWithColor.length} kategori
            </span>
          </div>

          <CategoriesList categories={categoriesWithColor} />
        </div>
      </div>
    </div>
  );
}

// --- Month picker -------------------------------------------------------

function MonthPicker({
  monthLabel,
  year,
  month,
  yearOptions,
  isCurrentMonth,
  onPrev,
  onNext,
  onPick,
  onJumpToday,
  pending,
}: {
  monthLabel: string;
  year: number;
  month: number;
  yearOptions: number[];
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPick: (y: number, m: number) => void;
  onJumpToday: () => void;
  pending: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedYear, setPickedYear] = useState(year);

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;

  // Bulan tidak boleh maju ke masa depan (kecuali user explicit pilih).
  const canGoNext = !(year === currentY && month >= currentM);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        aria-label="Bulan sebelumnya"
        disabled={pending}
      >
        <ChevronLeft size={16} />
      </Button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-elevated transition-colors text-base font-medium text-foreground"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
        >
          <span>{monthLabel}</span>
          <ChevronRight
            size={14}
            className={cn(
              "text-muted-foreground transition-transform",
              pickerOpen && "rotate-90",
            )}
          />
        </button>

        {pickerOpen ? (
          <YearMonthPanel
            pickedYear={pickedYear}
            onPickedYearChange={setPickedYear}
            yearOptions={yearOptions}
            currentYear={currentY}
            currentMonth={currentM}
            selectedYear={year}
            selectedMonth={month}
            onPick={(y, m) => {
              setPickerOpen(false);
              onPick(y, m);
            }}
          />
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        aria-label="Bulan berikutnya"
        disabled={pending || !canGoNext}
      >
        <ChevronRight size={16} />
      </Button>

      <div className="ml-auto">
        {!isCurrentMonth ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onJumpToday}
            disabled={pending}
          >
            Hari ini
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function YearMonthPanel({
  pickedYear,
  onPickedYearChange,
  yearOptions,
  currentYear,
  currentMonth,
  selectedYear,
  selectedMonth,
  onPick,
}: {
  pickedYear: number;
  onPickedYearChange: (y: number) => void;
  yearOptions: number[];
  currentYear: number;
  currentMonth: number;
  selectedYear: number;
  selectedMonth: number;
  onPick: (y: number, m: number) => void;
}) {
  const minYear = Math.min(...yearOptions);
  const maxYear = Math.max(currentYear, ...yearOptions);

  return (
    <div className="absolute z-50 mt-2 w-[280px] rounded-lg border border-border bg-popover shadow-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPickedYearChange(pickedYear - 1)}
          disabled={pickedYear <= minYear}
          aria-label="Tahun sebelumnya"
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {pickedYear}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPickedYearChange(pickedYear + 1)}
          disabled={pickedYear >= maxYear}
          aria-label="Tahun berikutnya"
        >
          <ChevronRight size={14} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_LABELS.map((label, idx) => {
          const m = idx + 1;
          const isFuture =
            pickedYear > currentYear ||
            (pickedYear === currentYear && m > currentMonth);
          const isSelected = pickedYear === selectedYear && m === selectedMonth;

          return (
            <button
              key={label}
              type="button"
              onClick={() => !isFuture && onPick(pickedYear, m)}
              disabled={isFuture}
              className={cn(
                "px-2 py-2 rounded-md text-xs font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isFuture
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-elevated",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Donut chart --------------------------------------------------------

function BudgetDonut({
  spent,
  budget,
  categories,
}: {
  spent: number;
  budget: number;
  categories: (BudgetCategoryData & { color: string })[];
}) {
  const hasBudget = budget > 0;
  const hasSpending = spent > 0;

  // Build segments: kategori dengan spent > 0 → wedge, sisanya → unused.
  // Kalau totalSpent > budget → tambahkan wedge "overage" merah.
  const segments: { id: string; value: number; color: string; label: string }[] =
    [];

  if (hasBudget && hasSpending) {
    const cap = Math.min(spent, budget);
    let remainingCap = cap;
    for (const cat of categories) {
      if (cat.spent <= 0) continue;
      const slice = Math.min(cat.spent, remainingCap);
      if (slice <= 0) break;
      segments.push({
        id: cat.id,
        value: slice,
        color: cat.color,
        label: cat.name,
      });
      remainingCap -= slice;
    }
    if (spent < budget) {
      segments.push({
        id: "unused",
        value: budget - spent,
        color: "#1C2128",
        label: "Sisa",
      });
    } else if (spent > budget) {
      segments.push({
        id: "overage",
        value: spent - budget,
        color: "#F85149",
        label: "Lebih",
      });
    }
  } else {
    segments.push({
      id: "unused",
      value: 1,
      color: "#1C2128",
      label: "Belum diatur",
    });
  }

  return (
    <div className="h-[300px] rounded-xl border border-border bg-card p-8 relative">
      <DonutSVG segments={segments} thickness={6} />

      {/* Center content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p className="text-xs text-muted-foreground mb-2">Terpakai</p>
        <p className="text-3xl font-semibold font-mono tabular-nums text-foreground mb-2">
          {formatIDR(spent)}
        </p>
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {hasBudget ? `dari ${formatIDR(budget)}` : "Belum ada batas"}
        </p>
      </div>
    </div>
  );
}

interface DonutSegment {
  id: string;
  value: number;
  color: string;
  label: string;
}

function DonutSVG({
  segments,
  thickness = 6,
}: {
  segments: DonutSegment[];
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  // SVG circle perimeter — kita pakai stroke-dasharray trick sehingga
  // tidak perlu d3-arc. Donut radius 50, stroke-width = thickness.
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full -rotate-90"
      aria-hidden
    >
      <g transform="translate(50, 50)">
        {segments.map((seg) => {
          const ratio = seg.value / total;
          const length = circumference * ratio;
          const dasharray = `${length} ${circumference - length}`;
          const dashoffset = -offset;
          offset += length;

          return (
            <circle
              key={seg.id}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
            >
              <title>
                {seg.label}: {formatIDR(seg.value)}
              </title>
            </circle>
          );
        })}
      </g>
    </svg>
  );
}

// --- Summary tabs (Budgeted / Actual) -----------------------------------

function BudgetSummaryTabs({
  spent,
  budget,
  remaining,
  utilization,
  income,
  categories,
  uncategorizedSpent,
}: {
  spent: number;
  budget: number;
  remaining: number;
  utilization: number;
  income: number;
  categories: (BudgetCategoryData & { color: string })[];
  uncategorizedSpent: number;
}) {
  const expectedIncome = budget; // Asumsi sederhana: target income == total budget.
  const incomeUtilization =
    expectedIncome > 0 ? Math.min((income / expectedIncome) * 100, 100) : 0;

  // Build expense breakdown untuk tab Actual.
  const totalSpentAll = spent + uncategorizedSpent;
  const expenseBreakdown = categories
    .filter((c) => c.spent > 0)
    .map((c) => ({
      name: c.name,
      color: c.color,
      amount: c.spent,
      percent:
        totalSpentAll > 0 ? Math.round((c.spent / totalSpentAll) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  if (uncategorizedSpent > 0) {
    expenseBreakdown.push({
      name: "Tanpa kategori",
      color: "#8B949E",
      amount: uncategorizedSpent,
      percent: Math.round((uncategorizedSpent / totalSpentAll) * 100),
    });
  }

  return (
    <Tabs defaultValue="budgeted">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="budgeted">Anggaran</TabsTrigger>
        <TabsTrigger value="actuals">Realisasi</TabsTrigger>
      </TabsList>

      <TabsContent value="budgeted" className="mt-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Expected income */}
          <div className="p-4 border-b border-border">
            <h3 className="text-xs text-muted-foreground mb-2">
              Target pemasukan
            </h3>
            <p className="mb-3 text-lg font-semibold font-mono tabular-nums text-foreground">
              {formatIDR(expectedIncome)}
            </p>
            <ProgressBar
              percent={incomeUtilization}
              fillClass="bg-income"
              trackClass="bg-elevated"
            />
            <div className="flex justify-between text-xs mt-2">
              <p className="text-muted-foreground">
                {formatIDR(income)} diterima
              </p>
              <p className="text-foreground font-medium">
                {formatIDR(Math.max(0, expectedIncome - income))} sisa
              </p>
            </div>
          </div>

          {/* Budgeted */}
          <div className="p-4">
            <h3 className="text-xs text-muted-foreground mb-2">Dianggarkan</h3>
            <p className="mb-3 text-lg font-semibold font-mono tabular-nums text-foreground">
              {formatIDR(budget)}
            </p>
            <ProgressBar
              percent={utilization}
              fillClass="bg-primary"
              trackClass="bg-elevated"
            />
            <div className="flex justify-between text-xs mt-2">
              <p className="text-muted-foreground">{formatIDR(spent)} terpakai</p>
              <p
                className={cn(
                  "font-medium",
                  remaining < 0 ? "text-expense" : "text-foreground",
                )}
              >
                {remaining < 0
                  ? `${formatIDR(Math.abs(remaining))} lebih`
                  : `${formatIDR(remaining)} sisa`}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="actuals" className="mt-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Income */}
          <div className="p-4 border-b border-border">
            <h3 className="text-xs text-muted-foreground mb-2">Pemasukan</h3>
            <p className="mb-3 text-lg font-semibold font-mono tabular-nums text-foreground">
              {formatIDR(income)}
            </p>
            {income > 0 ? (
              <div className="flex h-1.5 mb-2 gap-1">
                <div
                  className="rounded-full bg-income"
                  style={{ width: "100%" }}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Belum ada pemasukan bulan ini.
              </p>
            )}
          </div>

          {/* Expenses breakdown */}
          <div className="p-4">
            <h3 className="text-xs text-muted-foreground mb-2">Pengeluaran</h3>
            <p className="mb-3 text-lg font-semibold font-mono tabular-nums text-foreground">
              {formatIDR(totalSpentAll)}
            </p>
            {totalSpentAll > 0 ? (
              <>
                <div className="flex h-1.5 mb-3 gap-1 rounded-full overflow-hidden">
                  {expenseBreakdown.map((b) => (
                    <div
                      key={b.name}
                      className="h-full"
                      style={{
                        backgroundColor: b.color,
                        width: `${b.percent}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {expenseBreakdown.map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="text-muted-foreground truncate">
                        {b.name}
                      </span>
                      <span className="text-foreground font-mono">
                        {b.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Belum ada pengeluaran bulan ini.
              </p>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function ProgressBar({
  percent,
  fillClass,
  trackClass,
}: {
  percent: number;
  fillClass: string;
  trackClass: string;
}) {
  return (
    <div className={cn("flex h-1.5 gap-1 rounded-full overflow-hidden", trackClass)}>
      <div
        className={cn("rounded-full", fillClass)}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// --- Categories list ----------------------------------------------------

function CategoriesList({
  categories,
}: {
  categories: (BudgetCategoryData & { color: string })[];
}) {
  if (categories.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-elevated p-6 text-center">
        <p className="text-sm font-medium text-foreground mb-1">
          Belum ada kategori pengeluaran
        </p>
        <p className="text-xs text-muted-foreground">
          Tambahkan kategori dari halaman pengaturan untuk mulai mengatur
          anggaran.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-elevated p-1">
      <header className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Kategori</span>
        <span>·</span>
        <span className="font-mono tabular-nums">{categories.length}</span>
        <span className="ml-auto">Jumlah</span>
      </header>

      <div className="bg-card rounded-md py-1">
        {categories.map((cat, idx) => (
          <BudgetCategoryRow
            key={cat.id}
            category={cat}
            isLast={idx === categories.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetCategoryRow({
  category,
  isLast,
}: {
  category: BudgetCategoryData & { color: string };
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftLimit, setDraftLimit] = useState<string>(
    category.limit !== null ? String(category.limit) : "",
  );
  const [pending, startTransition] = useTransition();

  const hasLimit = category.limit !== null && category.limit > 0;
  const remaining = hasLimit ? (category.limit ?? 0) - category.spent : 0;
  const isOver = hasLimit && category.spent > (category.limit ?? 0);
  const overage = isOver ? category.spent - (category.limit ?? 0) : 0;

  function handleSave() {
    const num = Number(draftLimit);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Masukkan angka yang valid (≥ 0).");
      return;
    }
    startTransition(async () => {
      const result = await setBudgetLimit(category.id, num);
      if (result.ok) {
        toast.success(
          num > 0
            ? "Batas anggaran tersimpan."
            : "Batas anggaran dihapus.",
        );
        setEditing(false);
      } else {
        toast.error(result.error ?? "Gagal menyimpan batas anggaran.");
      }
    });
  }

  return (
    <div
      className={cn(
        "px-4 py-3 flex items-center gap-3",
        !isLast && "border-b border-border",
      )}
    >
      {/* Mini donut/icon */}
      <div className="relative w-10 h-10 shrink-0">
        <CategoryRowDonut
          spent={category.spent}
          limit={category.limit}
          color={category.color}
        />
        <div
          className="absolute inset-0 m-1.5 rounded-full flex items-center justify-center text-base"
          style={{
            backgroundColor: `color-mix(in oklab, ${category.color} 12%, transparent)`,
            color: category.color,
          }}
          aria-hidden
        >
          <span className="text-sm">{category.icon || "•"}</span>
        </div>
      </div>

      {/* Name + status */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {category.name}
        </p>
        <p
          className={cn(
            "text-xs font-medium font-mono tabular-nums",
            isOver
              ? "text-expense"
              : hasLimit
                ? "text-muted-foreground"
                : "text-muted-foreground",
          )}
        >
          {!hasLimit
            ? "Belum diatur"
            : isOver
              ? `${formatIDR(overage)} lebih`
              : `${formatIDR(remaining)} sisa`}
        </p>
      </div>

      {/* Right: amount or edit input */}
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={draftLimit}
              onChange={(e) => setDraftLimit(e.target.value)}
              placeholder="0"
              className="h-8 w-32 text-xs font-mono"
              aria-label={`Batas anggaran ${category.name}`}
              autoFocus
              disabled={pending}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleSave}
              disabled={pending}
              aria-label="Simpan"
            >
              <Check size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setEditing(false);
                setDraftLimit(
                  category.limit !== null ? String(category.limit) : "",
                );
              }}
              disabled={pending}
              aria-label="Batal"
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <>
            <div className="text-right">
              <p className="text-sm font-medium font-mono tabular-nums text-foreground">
                {formatIDR(category.spent)}
              </p>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                dari {hasLimit ? formatIDR(category.limit ?? 0) : "—"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              aria-label={`Atur batas ${category.name}`}
            >
              <Pencil size={12} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryRowDonut({
  spent,
  limit,
  color,
}: {
  spent: number;
  limit: number | null;
  color: string;
}) {
  const hasLimit = limit !== null && limit > 0;

  if (!hasLimit) {
    // Tidak ada limit → ring polos abu-abu transparan.
    return <DonutSVG segments={[{ id: "u", value: 1, color: "#30363D", label: "" }]} thickness={5} />;
  }

  const isOver = spent > limit;
  if (isOver) {
    return (
      <DonutSVG
        segments={[
          { id: "filled", value: limit, color, label: "Terpakai" },
          { id: "overage", value: spent - limit, color: "#F85149", label: "Lebih" },
        ]}
        thickness={5}
      />
    );
  }

  return (
    <DonutSVG
      segments={[
        { id: "filled", value: spent, color, label: "Terpakai" },
        { id: "rest", value: limit - spent, color: `${color}33`, label: "Sisa" },
      ]}
      thickness={5}
    />
  );
}
