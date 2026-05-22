"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { createAccount, updateAccount } from "@/app/actions/accounts";
import type { ActionResult } from "@/types";
import type { AccountTypeInput } from "@/lib/utils/validators";
import { toast } from "sonner";

export interface AccountFormInitial {
  id?: string;
  name: string;
  type: AccountTypeInput;
  balance: number;
  color: string;
  icon: string;
}

interface Props {
  mode: "create" | "edit";
  initial: AccountFormInitial;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  "#388BFD", // Accent/Brand Blue
  "#2EA043", // Income Green
  "#D29922", // Warning Yellow
  "#F85149", // Expense Red
  "#A371F7", // Purple
  "#39D353", // Neon Green
  "#8B949E", // Muted Gray
];

export function AccountForm({ mode, initial, onSuccess, onCancel }: Props) {
  const [type, setType] = useState<AccountTypeInput>(initial.type);
  const [selectedColor, setSelectedColor] = useState(initial.color || PRESET_COLORS[0]);

  const action =
    mode === "edit" && initial.id
      ? updateAccount.bind(null, initial.id)
      : createAccount;

  const [state, formAction, pending] = useActionState<
    ActionResult<null> | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      toast.success(
        mode === "edit"
          ? "Akun berhasil diperbarui"
          : "Akun baru berhasil ditambahkan"
      );
      onSuccess();
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <span className="block text-xs text-text-muted mb-1.5 font-medium">Tipe Akun</span>
        <div className="grid grid-cols-4 gap-1 p-1 bg-elevated border border-border rounded-md">
          {(["bank", "wallet", "cash", "investment"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-2 py-1.5 rounded text-[11px] font-medium capitalize transition-colors duration-150 ${
                type === t
                  ? "bg-canvas text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t === "bank" ? "Bank" : t === "wallet" ? "E-Wallet" : t === "cash" ? "Tunai" : "Investasi"}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nama Akun" error={state?.fieldErrors?.name?.[0]}>
          <input
            type="text"
            name="name"
            required
            defaultValue={initial.name}
            placeholder="Mis. BCA Personal, Gopay"
            className={inputClass}
          />
        </Field>

        <Field label="Saldo Awal / Saat Ini" error={state?.fieldErrors?.balance?.[0]}>
          <input
            type="number"
            inputMode="numeric"
            name="balance"
            required
            defaultValue={initial.balance || ""}
            placeholder="0"
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <span className="block text-xs text-text-muted mb-1.5 font-medium">Warna Label</span>
        <div className="flex items-center gap-2 py-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                selectedColor === c
                  ? "border-text-primary scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={selectedColor} />
      </div>

      <input type="hidden" name="icon" value="Wallet" />

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
          {mode === "edit" ? "Simpan perubahan" : "Tambah akun"}
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
