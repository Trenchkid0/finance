"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  deleteAccount,
  toggleAccountActive,
} from "@/app/actions/accounts";
import { formatIDR } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AccountForm,
  type AccountFormInitial,
} from "./AccountForm";
import type { AccountTypeInput } from "@/lib/utils/validators";

export interface AccountRowData {
  id: string;
  name: string;
  type: AccountTypeInput;
  balance: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  transactionCount: number;
}

interface Props {
  accounts: AccountRowData[];
}

const TYPE_LABEL: Record<AccountTypeInput, string> = {
  bank: "Bank",
  wallet: "E-wallet",
  cash: "Tunai",
  investment: "Investasi",
};

export function AccountsClient({ accounts }: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountRowData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AccountRowData | null>(null);

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">Akun</h1>
          <p className="text-sm text-muted-foreground">
            Kelola sumber dana — bank, e-wallet, tunai, dan investasi.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={14} />
          Tambah akun
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada akun"
          description="Tambahkan akun pertama Anda untuk mulai mencatat transaksi."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={12} />
              Tambah akun
            </Button>
          }
          className="rounded-lg border border-border bg-card"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onEdit={() => setEditing(a)}
              onDelete={() => setConfirmDelete(a)}
            />
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah akun</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <AccountForm
              mode="create"
              initial={{
                name: "",
                type: "bank",
                color: "#388BFD",
                icon: "",
                isActive: true,
              }}
              onSuccess={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah akun</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editing ? (
              <AccountForm
                mode="edit"
                initial={toFormInitial(editing)}
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
    </>
  );
}

// --- Card ----------------------------------------------------------------

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountRowData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(() => {
      void toggleAccountActive(account.id);
    });
  }

  const swatch = account.color ?? "#388BFD";

  return (
    <Card className={`p-5 ${account.isActive ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ background: `${swatch}1A`, color: swatch }}
          >
            {account.icon ?? <Wallet size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {account.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABEL[account.type]}
              {!account.isActive ? " · Nonaktif" : ""}
            </p>
          </div>
        </div>

        {/* Actions consolidated into a kebab menu so the card stays
            calm and the account name has full width. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Aksi akun"
              className="h-8 w-8 shrink-0"
              disabled={pending}
            >
              <MoreVertical size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleToggle}>
              {account.isActive ? (
                <>
                  <PowerOff size={14} />
                  Nonaktifkan
                </>
              ) : (
                <>
                  <Power size={14} />
                  Aktifkan
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil size={14} />
              Ubah
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 size={14} />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Saldo
      </p>
      <p className="text-3xl font-semibold font-mono tabular-nums text-foreground mt-1">
        {formatIDR(account.balance)}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {account.transactionCount} transaksi
        </p>
        <Link
          href={`/accounts/${account.id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Lihat detail
          <ChevronRight size={12} />
        </Link>
      </div>
    </Card>
  );
}

// --- Delete confirmation -------------------------------------------------

function ConfirmDelete({
  target,
  onClose,
}: {
  target: AccountRowData | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(target.id);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error ?? "Gagal menghapus akun.");
      }
    });
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus akun</DialogTitle>
          <DialogDescription>Tindakan ini tidak bisa dibatalkan.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {target ? (
            <div className="px-3 py-2 bg-elevated border border-border rounded-md">
              <p className="text-sm text-foreground">{target.name}</p>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {formatIDR(target.balance)} · {target.transactionCount} transaksi
              </p>
            </div>
          ) : null}

          {target && target.transactionCount > 0 ? (
            <p className="mt-3 text-xs text-warning">
              Akun ini memiliki riwayat transaksi. Pertimbangkan untuk
              menonaktifkan alih-alih menghapus.
            </p>
          ) : null}

          {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Helpers -------------------------------------------------------------

function toFormInitial(row: AccountRowData): AccountFormInitial {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    isActive: row.isActive,
  };
}
