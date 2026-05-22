"use client";

import { useState, useTransition } from "react";
import { Landmark, Pencil, Plus, Trash2, Wallet2, LineChart } from "lucide-react";
import { deleteAccount } from "@/app/actions/accounts";
import { formatIDR } from "@/lib/utils/formatters";
import { Modal } from "@/components/ui/Modal";
import { AccountForm } from "./AccountForm";
import { toast } from "sonner";

export interface AccountItem {
  id: string;
  name: string;
  type: "bank" | "wallet" | "cash" | "investment";
  balance: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
}

interface Props {
  accounts: AccountItem[];
}

export function AccountsClient({ accounts }: Props) {
  const [editing, setEditing] = useState<AccountItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AccountItem | null>(null);

  // Group accounts by type
  const activeAccounts = accounts.filter((a) => a.isActive);
  const banks = activeAccounts.filter((a) => a.type === "bank");
  const wallets = activeAccounts.filter((a) => a.type === "wallet");
  const cash = activeAccounts.filter((a) => a.type === "cash");
  const investments = activeAccounts.filter((a) => a.type === "investment");

  // Calculations
  const assets = activeAccounts.reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0);
  const liabilities = activeAccounts.reduce((sum, a) => sum + (a.balance < 0 ? Math.abs(a.balance) : 0), 0);
  const netWorth = assets - liabilities;

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-1">
            Akun
          </h1>
          <p className="text-sm text-text-muted">
            Kelola saldo dompet, rekening bank, tunai, dan akun investasi Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-accent text-white hover:bg-blue-500 transition-all duration-200 font-medium"
        >
          <Plus size={14} />
          Tambah Akun
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Total Aset</span>
            <span className="text-income"><Wallet2 size={16} /></span>
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-text-primary">
            {formatIDR(assets)}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Total Kewajiban</span>
            <span className="text-expense"><Landmark size={16} /></span>
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-text-primary">
            {formatIDR(liabilities)}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Kekayaan Bersih</span>
            <span className="text-accent"><LineChart size={16} /></span>
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-accent">
            {formatIDR(netWorth)}
          </p>
        </div>
      </div>

      {activeAccounts.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-16 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-elevated text-text-muted flex items-center justify-center mb-4">
            <Wallet2 size={24} />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">Belum ada akun terdaftar</h3>
          <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
            Daftarkan rekening bank, e-wallet, atau kas Anda terlebih dahulu untuk mencatat transaksi keuangan.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-accent text-white hover:bg-blue-500 transition-all duration-200 font-medium"
          >
            <Plus size={16} />
            Buat Akun Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {banks.length > 0 && <AccountGroup title="Rekening Bank" accounts={banks} onEdit={setEditing} onDelete={setConfirmDelete} />}
          {wallets.length > 0 && <AccountGroup title="E-Wallet" accounts={wallets} onEdit={setEditing} onDelete={setConfirmDelete} />}
          {cash.length > 0 && <AccountGroup title="Kas Tunai" accounts={cash} onEdit={setEditing} onDelete={setConfirmDelete} />}
          {investments.length > 0 && <AccountGroup title="Investasi" accounts={investments} onEdit={setEditing} onDelete={setConfirmDelete} />}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Tambah Akun Baru">
        <AccountForm
          mode="create"
          initial={{ name: "", type: "bank", balance: 0, color: "#388BFD", icon: "Wallet" }}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Ubah Detail Akun">
        {editing ? (
          <AccountForm
            mode="edit"
            initial={{
              id: editing.id,
              name: editing.name,
              type: editing.type,
              balance: editing.balance,
              color: editing.color || "#388BFD",
              icon: editing.icon || "Wallet",
            }}
            onSuccess={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}

// --- Account Group Render ------------------------------------------------
function AccountGroup({
  title,
  accounts,
  onEdit,
  onDelete,
}: {
  title: string;
  accounts: AccountItem[];
  onEdit: (acc: AccountItem) => void;
  onDelete: (acc: AccountItem) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
        {title} ({accounts.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between hover:border-[#444C56] transition-all duration-200"
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: acc.color || "#388BFD" }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {acc.name}
                </p>
                <p className="text-xs text-text-muted capitalize">
                  {acc.type === "cash" ? "Tunai" : acc.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`text-sm font-semibold font-mono tabular-nums ${acc.balance >= 0 ? "text-text-primary" : "text-expense"}`}>
                {formatIDR(acc.balance)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(acc)}
                  aria-label="Ubah"
                  className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-elevated transition-colors duration-150"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(acc)}
                  aria-label="Hapus"
                  className="p-1.5 rounded-md text-text-muted hover:text-expense hover:bg-elevated transition-colors duration-150"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Delete Confirmation -------------------------------------------------
function ConfirmDeleteModal({
  target,
  onClose,
}: {
  target: AccountItem | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteAccount(target.id);
      if (result.ok) {
        toast.success("Akun berhasil dihapus (dinonaktifkan)");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus akun");
      }
    });
  }

  return (
    <Modal open={target !== null} onClose={onClose} title="Hapus Akun">
      <div className="space-y-4">
        <p className="text-sm text-text-primary">
          Apakah Anda yakin ingin menghapus akun <span className="font-semibold text-text-primary">&quot;{target?.name}&quot;</span>?
        </p>
        <p className="text-xs text-text-muted bg-elevated border border-border p-3 rounded-md">
          ⚠️ **Catatan penting:** Tindakan ini akan menonaktifkan akun tersebut dari daftar aktif Anda. Transaksi historis yang berkaitan dengan akun ini akan tetap tersimpan untuk menjaga akurasi laporan pencatatan keuangan Anda.
        </p>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-expense/10 text-expense border border-expense/30 hover:bg-expense/20 transition-all duration-200 disabled:opacity-60 font-medium"
          >
            {pending ? "Menghapus..." : "Hapus Akun"}
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
