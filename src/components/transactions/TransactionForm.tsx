"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createTransaction,
  updateTransaction,
} from "@/app/actions/transactions";
import type { ActionResult } from "@/types";
import type { TransactionTypeInput } from "@/lib/utils/validators";
import { CustomSelect, type SelectOption } from "@/components/ui/CustomSelect";
import { toast } from "sonner";

export interface AccountOption {
  id: string;
  name: string;
  color?: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
}

export interface TransactionFormInitial {
  id?: string;
  type: TransactionTypeInput;
  accountId: string;
  categoryId: string | null;
  transferToId: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  note: string;
}

interface Props {
  mode: "create" | "edit";
  initial: TransactionFormInitial;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  mode,
  initial,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: Props) {
  const [type, setType] = useState<TransactionTypeInput>(initial.type);

  const action =
    mode === "edit" && initial.id
      ? updateTransaction.bind(null, initial.id)
      : createTransaction;

  const [state, formAction, pending] = useActionState<
    ActionResult<null> | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      toast.success(
        mode === "edit"
          ? "Transaksi berhasil diperbarui"
          : "Transaksi baru berhasil ditambahkan"
      );
      onSuccess();
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Map database choices to custom select options
  const accountSelectOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    color: a.color || undefined,
  }));

  const categorySelectOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: c.name,
    icon: c.icon ? <span>{c.icon}</span> : undefined,
  }));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Type segmented control */}
      <div>
        <span className="block text-xs text-text-muted mb-1.5 font-medium">Tipe</span>
        <div
          role="tablist"
          className="grid grid-cols-3 gap-1 p-1 bg-elevated border border-border rounded-md"
        >
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 ${
                type === t
                  ? "bg-canvas text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : t === "income" ? "Pemasukan" : "Transfer"}
            </button>
          ))}
        </div>
        {/* Hidden field carries the selected type to the action. */}
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Jumlah" error={state?.fieldErrors?.amount?.[0]}>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            name="amount"
            required
            defaultValue={initial.amount || ""}
            placeholder="0"
            className={inputClass}
          />
        </Field>

        <Field label="Tanggal" error={state?.fieldErrors?.date?.[0]}>
          <input
            type="date"
            name="date"
            required
            defaultValue={initial.date}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label={type === "transfer" ? "Dari akun" : "Akun"}
        error={state?.fieldErrors?.accountId?.[0]}
      >
        <CustomSelect
          name="accountId"
          options={accountSelectOptions}
          defaultValue={initial.accountId}
          placeholder="Pilih akun sumber"
          required
        />
      </Field>

      {type === "transfer" ? (
        <Field
          label="Ke akun"
          error={state?.fieldErrors?.transferToId?.[0]}
        >
          <CustomSelect
            name="transferToId"
            options={accountSelectOptions}
            defaultValue={initial.transferToId ?? ""}
            placeholder="Pilih akun tujuan"
            required
          />
        </Field>
      ) : (
        <Field label="Kategori" error={state?.fieldErrors?.categoryId?.[0]}>
          <CustomSelect
            name="categoryId"
            options={categorySelectOptions}
            defaultValue={initial.categoryId ?? ""}
            placeholder="Pilih kategori"
            required
          />
        </Field>
      )}

      <Field label="Deskripsi" error={state?.fieldErrors?.description?.[0]}>
        <input
          type="text"
          name="description"
          maxLength={200}
          defaultValue={initial.description}
          placeholder="Mis. Kopi pagi, Gaji bulanan"
          className={inputClass}
        />
      </Field>

      <Field label="Catatan (opsional)" error={state?.fieldErrors?.note?.[0]}>
        <textarea
          name="note"
          maxLength={2000}
          defaultValue={initial.note}
          rows={2}
          placeholder="Tulis catatan tambahan di sini..."
          className={`${inputClass} resize-none`}
        />
      </Field>

      {state?.error && !state.fieldErrors ? (
        <p className="text-xs text-expense">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 px-3 py-2 rounded-md text-sm bg-accent text-white hover:bg-blue-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {mode === "edit" ? "Simpan perubahan" : "Tambah transaksi"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-3 py-2 rounded-md text-sm bg-elevated border border-border text-text-primary hover:bg-[#2D333B] transition-all duration-200 disabled:opacity-60 font-medium"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1.5 font-medium">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-expense">{error}</p> : null}
    </div>
  );
}
