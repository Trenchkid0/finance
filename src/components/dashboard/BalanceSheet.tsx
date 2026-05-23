"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { formatIDR } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

/**
 * Balance sheet — pola Maybe Finance asli.
 *
 *   Assets · Rp 4.175.137
 *   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (stacked bar by group)
 *   ● Cash 16%   ● Investments 84%
 *
 *   ┌─────────────────────────────────────┐
 *   │ ▶ Cash               ▮▮░░░░░░░░ 16% │ Rp675.137
 *   │   • BNI               ▮░░░░░░░░  9% │ Rp377.628
 *   │   • Jago              ▮░░░░░░░░  1% │ Rp 52.000
 *   ├─────────────────────────────────────┤
 *   │ ▶ Investments        ▮▮▮▮▮▮▮▮▮░ 84% │ Rp3.500.000
 *   └─────────────────────────────────────┘
 *
 * Asset / Liability dipisah jadi dua kolom side-by-side. Setiap group
 * (Cash / Investments / Bank / dll) collapsible dengan <details>.
 */

export interface BalanceAccount {
  id: string;
  name: string;
  /** Rupiah whole number — sudah di-flip sign untuk liability bila perlu. */
  value: number;
  /** Persentase relatif terhadap total side (0..100). */
  percent: number;
  /** Inisial untuk avatar bulat (mis. "B" dari "BNI"). */
  initial: string;
}

export interface BalanceGroup {
  /** Mis. "Cash", "Investments", "Bank", "E-wallet". */
  name: string;
  color: string;
  total: number;
  percent: number;
  accounts: BalanceAccount[];
}

interface SideProps {
  title: "Assets" | "Liabilities";
  total: number;
  groups: BalanceGroup[];
}

interface Props {
  assets: SideProps;
  liabilities: SideProps;
}

export function BalanceSheet({ assets, liabilities }: Props) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <BalanceSide {...assets} />
      <BalanceSide {...liabilities} />
    </section>
  );
}

function BalanceSide({ title, total, groups }: SideProps) {
  const indoTitle = title === "Assets" ? "Aset" : "Liabilitas";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-medium text-foreground">{indoTitle}</h2>
        <span className="text-muted-foreground">·</span>
        <p className="text-base font-medium font-mono tabular-nums text-muted-foreground">
          {formatIDR(total)}
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptySide title={title} />
      ) : (
        <>
          {/* Stacked bar */}
          <div className="space-y-3">
            <div className="flex gap-1">
              {groups.map((g) => (
                <div
                  key={g.name}
                  className="h-1.5 rounded-sm transition-all"
                  style={{
                    width: `${g.percent}%`,
                    backgroundColor: g.color,
                  }}
                  aria-label={`${g.name}: ${g.percent.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {groups.map((g) => (
                <div
                  key={g.name}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="text-muted-foreground">{g.name}</span>
                  <span className="font-mono tabular-nums text-foreground font-medium">
                    {Math.round(g.percent)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Group list */}
          <div className="rounded-lg bg-elevated overflow-hidden">
            <header className="px-4 py-2 flex items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <span className="w-32">Nama</span>
              <span className="ml-auto flex items-center gap-6">
                <span className="w-24 text-right">Bobot</span>
                <span className="w-32 text-right">Nilai</span>
              </span>
            </header>
            <div className="bg-card rounded-md m-1 mt-0">
              {groups.map((g, idx) => (
                <GroupRow
                  key={g.name}
                  group={g}
                  isLast={idx === groups.length - 1}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptySide({ title }: { title: "Assets" | "Liabilities" }) {
  const isAssets = title === "Assets";
  return (
    <div className="py-10 flex flex-col items-center text-center">
      <span className="size-8 rounded-md bg-elevated text-muted-foreground flex items-center justify-center mb-3">
        <Plus size={16} />
      </span>
      <p className="text-sm font-medium text-foreground mb-1">
        {isAssets ? "Belum ada aset" : "Belum ada liabilitas"}
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {isAssets
          ? "Tambahkan akun pertama untuk melihat distribusi aset Anda."
          : "Tambahkan kartu kredit atau pinjaman untuk melacak liabilitas."}
      </p>
      {isAssets ? (
        <Link
          href="/accounts"
          className="mt-3 text-xs text-primary hover:underline font-medium"
        >
          Tambah akun →
        </Link>
      ) : null}
    </div>
  );
}

function GroupRow({ group, isLast }: { group: BalanceGroup; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn(!isLast && "border-b border-border")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center hover:bg-elevated/40 transition-colors duration-150"
      >
        <span className="w-32 flex items-center gap-2 text-sm font-medium text-foreground">
          <ChevronRight
            size={14}
            className={cn(
              "text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          {group.name}
        </span>
        <span className="ml-auto flex items-center gap-6 text-sm">
          <span className="w-24 flex justify-end">
            <DotWeight percent={group.percent} color={group.color} />
          </span>
          <span className="w-32 text-right font-mono tabular-nums text-foreground">
            {formatIDR(group.total)}
          </span>
        </span>
      </button>

      {open ? (
        <div className="bg-elevated/30">
          {group.accounts.map((acc, idx) => (
            <Link
              key={acc.id}
              href={`/accounts/${acc.id}`}
              className={cn(
                "pl-12 pr-4 py-2.5 flex items-center text-sm hover:bg-elevated/60 transition-colors duration-150",
                idx > 0 && "border-t border-border/60",
              )}
            >
              <span className="w-32 flex items-center gap-2.5">
                <span
                  className="size-6 rounded-full border flex items-center justify-center text-[10px] font-medium uppercase shrink-0"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${group.color} 12%, transparent)`,
                    borderColor: `color-mix(in oklab, ${group.color} 30%, transparent)`,
                    color: group.color,
                  }}
                >
                  {acc.initial}
                </span>
                <span className="text-foreground truncate">{acc.name}</span>
              </span>
              <span className="ml-auto flex items-center gap-6">
                <span className="w-24 flex justify-end">
                  <DotWeight percent={acc.percent} color={group.color} />
                </span>
                <span className="w-32 text-right font-mono tabular-nums text-foreground">
                  {formatIDR(acc.value)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 10-dot weight indicator (Maybe Finance style).
 *
 *   ▮▮▮▮░░░░░░ 42%
 *
 * Dot count = ceil(percent / 10), max 10. Dot inactive di-render dengan
 * opacity 20% dari color yang sama supaya konsisten dengan group.
 */
function DotWeight({ percent, color }: { percent: number; color: string }) {
  const filled = Math.min(10, Math.max(0, Math.ceil(percent / 10)));
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-0.5 h-2.5 rounded-full",
              i >= filled && "opacity-20",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      <span className="font-mono tabular-nums text-xs text-foreground min-w-[40px] text-right">
        {percent.toFixed(percent < 10 ? 2 : 1)}%
      </span>
    </span>
  );
}
