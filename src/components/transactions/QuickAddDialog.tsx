"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
  type TransactionFormInitial,
} from "./TransactionForm";
import { useQuickAdd } from "./QuickAddProvider";

interface Props {
  accounts: AccountOption[];
  categories: CategoryOption[];
  aiScanEnabled: boolean;
}

/**
 * Dialog global "Tambah transaksi" — di-render dari dashboard layout
 * sehingga bisa dibuka dari mana saja lewat `useQuickAdd().open()`.
 *
 * Sengaja tidak melakukan fetch sendiri: data accounts & categories
 * di-pass dari layout (server component), supaya fast first paint dan
 * tidak boros API call setiap navigasi.
 */
export function QuickAddDialog({
  accounts,
  categories,
  aiScanEnabled,
}: Props) {
  const { isOpen, close } = useQuickAdd();

  if (accounts.length === 0) {
    // Layout sudah pasang `canCreate=false` → dialog tidak akan terbuka.
    return null;
  }

  const initial: TransactionFormInitial = {
    type: "expense",
    accountId: accounts[0].id,
    categoryId: null,
    transferToId: null,
    amount: 0,
    date: todayLocalISO(),
    description: "",
    note: "",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah transaksi</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <TransactionForm
            mode="create"
            initial={initial}
            accounts={accounts}
            categories={categories}
            aiScanEnabled={aiScanEnabled}
            onSuccess={close}
            onCancel={close}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function todayLocalISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
