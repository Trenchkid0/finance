"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { deleteTransaction } from "@/app/actions/transactions";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
  type TransactionFormInitial,
} from "./TransactionForm";
import {
  InlineCategoryPicker,
  TransferBadge,
} from "./InlineCategoryPicker";

export interface TransactionRowData {
  id: string;
  type: "income" | "expense" | "transfer";
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  transferToId: string | null;
  transferToName: string | null;
  amount: number;
  date: string;
  description: string | null;
  note: string | null;
}

export interface TransactionFiltersState {
  q: string;
  type: "all" | "income" | "expense" | "transfer";
  accountId: string;
  categoryId: string;
  /** YYYY-MM-DD; empty string means "no filter". */
  startDate: string;
  endDate: string;
}

export interface TransactionPagination {
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  total: number;
  totalPages: number;
}

export interface TransactionSummary {
  total: number;
  income: number;
  expense: number;
}

interface Props {
  transactions: TransactionRowData[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  filters: TransactionFiltersState;
  pagination: TransactionPagination;
  summary: TransactionSummary;
  /** True kalau DEEPSEEK_API_KEY ter-set di server. */
  aiScanEnabled: boolean;
}

export function TransactionsClient({
  transactions,
  accounts,
  categories,
  filters,
  pagination,
  summary,
  aiScanEnabled,
}: Props) {
  const [editing, setEditing] = useState<TransactionRowData | null>(null);
  const [creating, setCreating] = useState<TransactionFormInitial | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TransactionRowData | null>(null);
  const searchParams = useSearchParams();

  const canCreate = accounts.length > 0;

  function startCreate() {
    setCreating(blankInitial(accounts[0]?.id ?? ""));
  }

  function startDuplicate(row: TransactionRowData) {
    // Pre-fill semua field tapi reset tanggal ke hari ini supaya
    // duplikasi cocok untuk skenario "bayar Netflix tiap bulan".
    setCreating({
      type: row.type,
      accountId: row.accountId,
      categoryId: row.categoryId,
      transferToId: row.transferToId,
      amount: row.amount,
      date: todayLocalISO(),
      description: row.description ?? "",
      note: row.note ?? "",
    });
  }

  function exportHref(): string {
    const qs = searchParams.toString();
    return qs ? `/transactions/export?${qs}` : "/transactions/export";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">
            Transaksi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola dan telusuri pemasukan, pengeluaran, dan transfer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm" title="Unduh CSV">
            <a href={exportHref()} download>
              <Download size={14} />
              Export
            </a>
          </Button>
          <Button
            onClick={startCreate}
            disabled={!canCreate}
            size="sm"
            title={canCreate ? undefined : "Tambahkan akun terlebih dahulu"}
          >
            <Plus size={14} />
            Tambah transaksi
          </Button>
        </div>
      </div>

      {/* 3-stat summary card — refleksif terhadap filter aktif */}
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-border bg-card divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total transaksi
          </p>
          <p className="text-xl font-medium font-mono tabular-nums text-foreground">
            {summary.total}
          </p>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Pemasukan
          </p>
          <p className="text-xl font-medium font-mono tabular-nums text-income">
            {formatIDR(summary.income)}
          </p>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Pengeluaran
          </p>
          <p className="text-xl font-medium font-mono tabular-nums text-expense">
            {formatIDR(summary.expense)}
          </p>
        </div>
      </div>

      <FilterBar
        filters={filters}
        accounts={accounts}
        categories={categories}
      />

      <TransactionsList
        transactions={transactions}
        categories={categories}
        onEdit={setEditing}
        onDelete={setConfirmDelete}
        onDuplicate={startDuplicate}
        emptyState={
          isFilterActive(filters) ? (
            <EmptyState
              icon={Search}
              title="Tidak ada transaksi cocok"
              description="Coba ubah kata kunci atau reset filter."
              size="sm"
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="Belum ada transaksi"
              description={
                canCreate
                  ? "Catat transaksi pertama Anda untuk mulai melacak arus kas."
                  : "Tambahkan akun terlebih dahulu untuk mencatat transaksi."
              }
              action={
                canCreate ? (
                  <Button size="sm" onClick={startCreate}>
                    <Plus size={12} />
                    Tambah transaksi
                  </Button>
                ) : null
              }
              size="sm"
            />
          )
        }
      />

      <PaginationBar pagination={pagination} />

      {/* Create / Duplicate */}
      <Dialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah transaksi</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {creating ? (
              <TransactionForm
                mode="create"
                initial={creating}
                accounts={accounts}
                categories={categories}
                aiScanEnabled={aiScanEnabled}
                onSuccess={() => setCreating(null)}
                onCancel={() => setCreating(null)}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah transaksi</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editing ? (
              <TransactionForm
                mode="edit"
                initial={toFormInitial(editing)}
                accounts={accounts}
                categories={categories}
                onSuccess={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// --- URL-state helpers ---------------------------------------------------

/**
 * Build a new search-param string from the current one + a partial
 * patch. `null`/`undefined` removes the key. Always resets `page` to 1
 * when any filter (other than page itself) changes.
 */
function withParams(
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(current);
  let changedNonPage = false;

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== "page" && key !== "pageSize") changedNonPage = true;
  }
  // Reset page when filter changes unless caller explicitly set page.
  if (changedNonPage && !("page" in patch)) {
    next.delete("page");
  }
  return next.toString();
}

// --- Filter bar ----------------------------------------------------------

function FilterBar({
  filters,
  accounts,
  categories,
}: {
  filters: TransactionFiltersState;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pushFilter(patch: Record<string, string | null | undefined>) {
    const qs = withParams(searchParams, patch);
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const active = isFilterActive(filters);

  return (
    <form
      action=""
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        pushFilter({
          q: (fd.get("q") as string) ?? "",
          startDate: (fd.get("startDate") as string) || null,
          endDate: (fd.get("endDate") as string) || null,
        });
      }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Cari deskripsi atau catatan..."
            className="pl-9"
            aria-label="Cari transaksi"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:flex lg:items-center">
          <FilterSelect
            label="Tipe"
            value={filters.type}
            onChange={(v) => pushFilter({ type: v })}
            options={[
              { value: "all", label: "Semua tipe" },
              { value: "income", label: "Pemasukan" },
              { value: "expense", label: "Pengeluaran" },
              { value: "transfer", label: "Transfer" },
            ]}
          />
          <FilterSelect
            label="Akun"
            value={filters.accountId}
            onChange={(v) => pushFilter({ accountId: v })}
            options={[
              { value: "all", label: "Semua akun" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <FilterSelect
            label="Kategori"
            value={filters.categoryId}
            onChange={(v) => pushFilter({ categoryId: v })}
            options={[
              { value: "all", label: "Semua kategori" },
              { value: "none", label: "Tanpa kategori" },
              ...categories.map((c) => ({
                value: c.id,
                label: `${c.icon ? `${c.icon} ` : ""}${c.name}`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Date range + actions row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-muted-foreground">Rentang tanggal</span>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              name="startDate"
              defaultValue={filters.startDate}
              max={filters.endDate || undefined}
              className="h-8 text-xs w-36"
              aria-label="Tanggal mulai"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <Input
              type="date"
              name="endDate"
              defaultValue={filters.endDate}
              min={filters.startDate || undefined}
              className="h-8 text-xs w-36"
              aria-label="Tanggal akhir"
            />
          </div>
          <DateRangePresets
            onPick={(range) =>
              pushFilter({
                startDate: range.start,
                endDate: range.end,
              })
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            Terapkan
          </Button>
          {active ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                pushFilter({
                  q: null,
                  type: null,
                  accountId: null,
                  categoryId: null,
                  startDate: null,
                  endDate: null,
                })
              }
            >
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

// --- Date range presets --------------------------------------------------

interface DateRange {
  start: string;
  end: string;
}

function DateRangePresets({ onPick }: { onPick: (r: DateRange) => void }) {
  const today = new Date();
  const isoToday = isoFromDate(today);

  function preset(label: string, range: DateRange) {
    return (
      <button
        key={label}
        type="button"
        onClick={() => onPick(range)}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
      </button>
    );
  }

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 6);
  const last30 = new Date(today);
  last30.setDate(last30.getDate() - 29);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {preset("Hari ini", { start: isoToday, end: isoToday })}
      {preset("7 hari", { start: isoFromDate(last7), end: isoToday })}
      {preset("30 hari", { start: isoFromDate(last30), end: isoToday })}
      {preset("Bulan ini", { start: isoFromDate(startOfMonth), end: isoToday })}
      {preset("Bulan lalu", {
        start: isoFromDate(startOfPrevMonth),
        end: isoFromDate(endOfPrevMonth),
      })}
    </div>
  );
}

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface FilterSelectOption {
  value: string;
  label: string;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterSelectOption[];
}) {
  return (
    <div className="grid gap-1.5 sm:gap-1">
      <Label className="sr-only">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// --- List (grouped by date) ---------------------------------------------

/**
 * Transaction list — pola Maybe Finance asli.
 *
 *   ┌─ MAY 16, 2026 · 2 ───────────── -Rp 310.000 ─┐
 *   │ ┌────────────────────────────────────────┐  │
 *   │ │ ⓣ Top Up Shopeepay  [Shopping]   -290k │  │
 *   │ │   BNI                                  │  │
 *   │ ├────────────────────────────────────────┤  │
 *   │ │ ⓑ Bakmi Resto Rio   [Food]       -20k │  │
 *   │ │   Jago                                 │  │
 *   │ └────────────────────────────────────────┘  │
 *   └─────────────────────────────────────────────┘
 *
 * Group total mempermudah scanning harian — user langsung lihat hari
 * mana paling boros tanpa harus jumlahkan sendiri.
 */
function TransactionsList({
  transactions,
  categories,
  onEdit,
  onDelete,
  onDuplicate,
  emptyState,
}: {
  transactions: TransactionRowData[];
  categories: CategoryOption[];
  onEdit: (row: TransactionRowData) => void;
  onDelete: (row: TransactionRowData) => void;
  onDuplicate: (row: TransactionRowData) => void;
  emptyState: React.ReactNode;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        {emptyState}
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="space-y-4">
      {/* Column header — desktop only */}
      <div className="hidden md:grid grid-cols-12 px-5 py-3 text-xs uppercase font-medium text-muted-foreground tracking-wider">
        <span className="col-span-7">Transaksi</span>
        <span className="col-span-3">Kategori</span>
        <span className="col-span-2 text-right">Jumlah</span>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <DateGroup
            key={group.date}
            group={group}
            categories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    </div>
  );
}

interface TransactionGroup {
  date: string;
  label: string;
  total: number;
  items: TransactionRowData[];
}

function groupByDate(rows: TransactionRowData[]): TransactionGroup[] {
  const buckets = new Map<string, TransactionRowData[]>();
  for (const tx of rows) {
    const key = tx.date.slice(0, 10);
    const list = buckets.get(key) ?? [];
    list.push(tx);
    buckets.set(key, list);
  }

  // Sudah ter-sort di server (date desc, createdAt desc) — kita preserve
  // urutan dengan iterate ulang dari rows, bukan dari Map keys yang
  // tidak garansi insertion order setelah delete.
  const seen = new Set<string>();
  const ordered: TransactionGroup[] = [];
  for (const tx of rows) {
    const key = tx.date.slice(0, 10);
    if (seen.has(key)) continue;
    seen.add(key);
    const items = buckets.get(key)!;
    ordered.push({
      date: key,
      label: formatGroupDate(key),
      total: items.reduce((sum, t) => sum + signedAmount(t), 0),
      items,
    });
  }
  return ordered;
}

function signedAmount(tx: TransactionRowData): number {
  if (tx.type === "income") return tx.amount;
  if (tx.type === "expense") return -tx.amount;
  return 0; // transfer netral terhadap net worth
}

function formatGroupDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DateGroup({
  group,
  categories,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  group: TransactionGroup;
  categories: CategoryOption[];
  onEdit: (row: TransactionRowData) => void;
  onDelete: (row: TransactionRowData) => void;
  onDuplicate: (row: TransactionRowData) => void;
}) {
  const totalColor =
    group.total > 0
      ? "text-income"
      : group.total < 0
        ? "text-expense"
        : "text-foreground";

  return (
    <section className="rounded-xl bg-elevated p-1">
      <header className="flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground">
        <p className="uppercase tracking-wider">
          <span>{group.label}</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono tabular-nums">{group.items.length}</span>
        </p>
        <p className={`font-mono tabular-nums ${totalColor}`}>
          {group.total > 0 ? "+" : ""}
          {formatIDR(group.total)}
        </p>
      </header>

      <div className="rounded-lg bg-card border border-border divide-y divide-border">
        {group.items.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            categories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    </section>
  );
}

function TransactionRow({
  tx,
  categories,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  tx: TransactionRowData;
  categories: CategoryOption[];
  onEdit: (row: TransactionRowData) => void;
  onDelete: (row: TransactionRowData) => void;
  onDuplicate: (row: TransactionRowData) => void;
}) {
  const initial =
    (tx.description ?? tx.categoryName ?? "T").trim().charAt(0).toUpperCase() ||
    "T";

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-elevated/40 transition-colors duration-150">
      {/* Avatar + description + account (col-span 7) */}
      <div className="col-span-12 md:col-span-7 flex items-center gap-3 min-w-0">
        <span className="size-7 rounded-full bg-elevated border border-border text-muted-foreground flex items-center justify-center text-[11px] font-medium uppercase shrink-0">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-medium truncate">
            {tx.description ?? tx.categoryName ?? "Transaksi"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {tx.type === "transfer" ? (
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight size={11} />
                Transfer · {tx.accountName} → {tx.transferToName ?? "?"}
              </span>
            ) : (
              tx.accountName
            )}
          </p>
        </div>
      </div>

      {/* Category badge (col-span 3) — klik untuk re-categorize */}
      <div className="hidden md:flex md:col-span-3 items-center min-w-0">
        {tx.type === "transfer" ? (
          <TransferBadge transferToName={tx.transferToName} />
        ) : (
          <InlineCategoryPicker
            transactionId={tx.id}
            type={tx.type}
            categoryId={tx.categoryId}
            categoryName={tx.categoryName}
            categoryIcon={tx.categoryIcon}
            categories={categories}
          />
        )}
      </div>

      {/* Amount + actions (col-span 2) */}
      <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1">
        <p
          className={`font-mono tabular-nums whitespace-nowrap ${amountClass(tx.type)}`}
        >
          {amountPrefix(tx.type)}
          {formatIDR(tx.amount)}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Opsi transaksi"
              className="h-7 w-7"
            >
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onEdit(tx)}>
              <Pencil size={12} />
              Ubah
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(tx)}>
              <Copy size={12} />
              Duplikasi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(tx)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={12} />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function amountClass(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "text-income";
  if (type === "expense") return "text-expense";
  return "text-foreground";
}

function amountPrefix(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "+";
  if (type === "expense") return "-";
  return "";
}

// --- Pagination ----------------------------------------------------------

function PaginationBar({
  pagination,
}: {
  pagination: TransactionPagination;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const { page, pageSize, pageSizeOptions, total, totalPages } = pagination;

  function go(targetPage: number) {
    const qs = withParams(searchParams, { page: String(targetPage) });
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  function setSize(newSize: string) {
    const qs = withParams(searchParams, {
      pageSize: newSize === String(25) ? null : newSize,
      page: null,
    });
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
      <p className="tabular-nums">
        Menampilkan{" "}
        <span className="text-foreground font-medium">{start}</span>–
        <span className="text-foreground font-medium">{end}</span> dari{" "}
        <span className="text-foreground font-medium">{total}</span> transaksi
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Per halaman</span>
          <Select value={String(pageSize)} onValueChange={setSize}>
            <SelectTrigger className="h-8 w-20" aria-label="Baris per halaman">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(1)}
            disabled={pending || page <= 1}
            aria-label="Halaman pertama"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(page - 1)}
            disabled={pending || page <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="px-2 text-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(page + 1)}
            disabled={pending || page >= totalPages}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(totalPages)}
            disabled={pending || page >= totalPages}
            aria-label="Halaman terakhir"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Empty state — handled inline via the `emptyState` prop using the
// shared `EmptyState` primitive from `@/components/ui/empty-state`. ----

// --- Delete confirmation -------------------------------------------------

function ConfirmDelete({
  target,
  onClose,
}: {
  target: TransactionRowData | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteTransaction(target.id);
      if (result.ok) {
        toast.success("Transaksi berhasil dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus transaksi");
      }
    });
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus transaksi</DialogTitle>
          <DialogDescription>
            {target?.type === "transfer"
              ? "Saldo akun sumber dan akun tujuan akan dikoreksi otomatis."
              : "Saldo akun akan disesuaikan otomatis."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {target ? (
            <div className="px-3 py-2 bg-elevated border border-border rounded-md">
              <p className="text-sm text-foreground">
                {target.description ?? target.categoryName ?? "Transaksi"}
              </p>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {formatIDR(target.amount)} · {formatDateShort(target.date)}
              </p>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Helpers -------------------------------------------------------------

function isFilterActive(f: TransactionFiltersState): boolean {
  return (
    f.q.length > 0 ||
    f.type !== "all" ||
    f.accountId !== "all" ||
    f.categoryId !== "all" ||
    f.startDate !== "" ||
    f.endDate !== ""
  );
}

function blankInitial(firstAccountId: string): TransactionFormInitial {
  return {
    type: "expense",
    accountId: firstAccountId,
    categoryId: null,
    transferToId: null,
    amount: 0,
    date: todayLocalISO(),
    description: "",
    note: "",
  };
}

function toFormInitial(row: TransactionRowData): TransactionFormInitial {
  return {
    id: row.id,
    type: row.type,
    accountId: row.accountId,
    categoryId: row.categoryId,
    transferToId: row.transferToId,
    amount: row.amount,
    date: row.date.slice(0, 10),
    description: row.description ?? "",
    note: row.note ?? "",
  };
}

function todayLocalISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
