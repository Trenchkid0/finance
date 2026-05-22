"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import { deleteTransaction } from "@/app/actions/transactions";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";
import { Modal } from "@/components/ui/Modal";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
  type TransactionFormInitial,
} from "./TransactionForm";
import { toast } from "sonner";
import { subDays, startOfMonth, startOfYear, isAfter } from "date-fns";

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
  date: string; // ISO
  description: string | null;
  note: string | null;
}

interface Props {
  transactions: TransactionRowData[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}

type DateRangeFilter = "all" | "30days" | "month" | "year";

export function TransactionsClient({ transactions, accounts, categories }: Props) {
  const [editing, setEditing] = useState<TransactionRowData | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TransactionRowData | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");

  const canCreate = accounts.length > 0;

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Text Search
    if (search.trim()) {
      const query = search.toLowerCase();
      const descMatch = tx.description?.toLowerCase().includes(query);
      const catMatch = tx.categoryName?.toLowerCase().includes(query);
      const accMatch = tx.accountName.toLowerCase().includes(query);
      if (!descMatch && !catMatch && !accMatch) return false;
    }

    // 2. Type Filter
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;

    // 3. Account Filter
    if (accountFilter !== "all" && tx.accountId !== accountFilter && tx.transferToId !== accountFilter) return false;

    // 4. Category Filter
    if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;

    // 5. Date Range Filter
    const txDate = new Date(tx.date);
    const now = new Date();
    if (dateFilter === "30days") {
      const thirtyDaysAgo = subDays(now, 30);
      if (!isAfter(txDate, thirtyDaysAgo)) return false;
    } else if (dateFilter === "month") {
      const firstOfMonth = startOfMonth(now);
      if (!isAfter(txDate, firstOfMonth)) return false;
    } else if (dateFilter === "year") {
      const firstOfYear = startOfYear(now);
      if (!isAfter(txDate, firstOfYear)) return false;
    }

    return true;
  });

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-1">
            Transaksi
          </h1>
          <p className="text-sm text-text-muted">
            Semua pemasukan, pengeluaran, dan transfer rekening Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={!canCreate}
          title={canCreate ? undefined : "Tambahkan akun terlebih dahulu"}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm bg-accent text-white hover:bg-blue-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-medium self-start md:self-auto"
        >
          <Plus size={14} />
          Tambah Transaksi
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-text-muted shrink-0" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan deskripsi, kategori, atau akun..."
            className="w-full bg-elevated border border-border rounded-md pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Type Filter */}
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Tipe</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Tipe</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Akun</label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Akun</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Kategori</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Waktu</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
              className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Waktu</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
            </select>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState onAdd={() => setCreating(true)} disabled={!canCreate} isFiltered={transactions.length > 0} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Tanggal</th>
                  <th className="text-left px-6 py-3">Deskripsi</th>
                  <th className="text-left px-6 py-3">Akun</th>
                  <th className="text-right px-6 py-3">Jumlah</th>
                  <th className="px-6 py-3 w-20" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-b-0 hover:bg-elevated/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-3 text-xs text-text-muted whitespace-nowrap font-mono tabular-nums">
                      {formatDateShort(tx.date)}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-text-primary">
                        {tx.description ?? tx.categoryName ?? "Transaksi"}
                      </p>
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        {tx.categoryIcon && <span>{tx.categoryIcon}</span>}
                        {tx.type === "transfer"
                          ? `Transfer → ${tx.transferToName ?? "?"}`
                          : tx.categoryName ?? "Tanpa kategori"}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-muted">
                      {tx.accountName}
                    </td>
                    <td
                      className={`px-6 py-3 text-sm font-mono tabular-nums text-right whitespace-nowrap font-semibold ${amountClass(tx.type)}`}
                    >
                      {amountPrefix(tx.type)}
                      {formatIDR(tx.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(tx)}
                          aria-label="Ubah"
                          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-canvas transition-colors duration-150"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(tx)}
                          aria-label="Hapus"
                          className="p-1.5 rounded-md text-text-muted hover:text-expense hover:bg-canvas transition-colors duration-150"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked List View */}
          <div className="md:hidden space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2 hover:border-[#444C56] transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {tx.description ?? tx.categoryName ?? "Transaksi"}
                    </p>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 truncate">
                      {tx.categoryIcon && <span className="scale-90">{tx.categoryIcon}</span>}
                      <span>
                        {tx.type === "transfer"
                          ? `${tx.accountName} ➔ ${tx.transferToName ?? "?"}`
                          : tx.categoryName ?? "Tanpa kategori"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono tabular-nums font-semibold whitespace-nowrap ${amountClass(tx.type)}`}
                  >
                    {amountPrefix(tx.type)}
                    {formatIDR(tx.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                  <span className="text-[10px] text-text-muted font-mono tabular-nums">
                    {formatDateShort(tx.date)} · {tx.accountName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(tx)}
                      aria-label="Ubah"
                      className="p-1 rounded bg-elevated text-text-muted hover:text-text-primary"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(tx)}
                      aria-label="Hapus"
                      className="p-1 rounded bg-elevated text-text-muted hover:text-expense"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tambah Transaksi Baru"
      >
        <TransactionForm
          mode="create"
          initial={blankInitial(accounts[0]?.id ?? "")}
          accounts={accounts}
          categories={categories}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Ubah Transaksi"
      >
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
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDelete
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}

function amountClass(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "text-income";
  if (type === "expense") return "text-expense";
  return "text-text-primary";
}

function amountPrefix(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "+";
  if (type === "expense") return "-";
  return "";
}

// --- Empty state ---------------------------------------------------------
function EmptyState({
  onAdd,
  disabled,
  isFiltered,
}: {
  onAdd: () => void;
  disabled: boolean;
  isFiltered: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-16 text-center">
      <p className="text-sm font-medium text-text-primary mb-1">
        {isFiltered ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}
      </p>
      <p className="text-xs text-text-muted mb-4 max-w-xs mx-auto">
        {isFiltered
          ? "Coba ubah kata kunci pencarian atau bersihkan filter yang terpasang."
          : disabled
          ? "Tambahkan akun terlebih dahulu untuk mulai mencatat transaksi."
          : "Catat transaksi pertama Anda untuk mulai melacak arus kas keuangan."}
      </p>
      {!disabled && !isFiltered ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:bg-blue-500 transition-all duration-200 font-medium"
        >
          <Plus size={12} />
          Tambah Transaksi
        </button>
      ) : null}
    </div>
  );
}

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
        toast.error(result.error ?? "Gagal menghapus transaksi.");
      }
    });
  }

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="Hapus Transaksi"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-primary">
          Apakah Anda yakin ingin menghapus transaksi ini? Saldo akun akan disesuaikan otomatis secara real-time.
        </p>
        {target ? (
          <div className="px-3 py-2 bg-elevated border border-border rounded-md">
            <p className="text-sm font-semibold text-text-primary">
              {target.description ?? target.categoryName ?? "Transaksi"}
            </p>
            <p className="text-xs text-text-muted font-mono tabular-nums mt-0.5">
              {formatIDR(target.amount)} · {formatDateShort(target.date)} · {target.accountName}
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-expense/10 text-expense border border-expense/30 hover:bg-expense/20 transition-all duration-200 disabled:opacity-60 font-medium"
          >
            {pending ? "Menghapus..." : "Hapus Transaksi"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-3 py-2 rounded-md text-sm bg-elevated border border-border text-text-primary hover:bg-[#2D333B] transition-all duration-200 disabled:opacity-60 font-medium"
          >
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Helpers -------------------------------------------------------------
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
