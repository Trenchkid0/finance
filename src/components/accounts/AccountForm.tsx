"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { createAccount, updateAccount } from "@/app/actions/accounts";
import type { ActionResult } from "@/types";
import type { AccountTypeInput } from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AccountFormInitial {
  id?: string;
  name: string;
  type: AccountTypeInput;
  color: string | null;
  icon: string | null;
  isActive: boolean;
}

interface Props {
  mode: "create" | "edit";
  initial: AccountFormInitial;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: AccountTypeInput; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "wallet", label: "E-wallet" },
  { value: "cash", label: "Tunai" },
  { value: "investment", label: "Investasi" },
];

const COLOR_SWATCHES = [
  "#388BFD",
  "#2EA043",
  "#D29922",
  "#F85149",
  "#A371F7",
  "#39D353",
  "#8B949E",
] as const;

export function AccountForm({ mode, initial, onSuccess, onCancel }: Props) {
  const [color, setColor] = useState<string>(initial.color ?? COLOR_SWATCHES[0]);
  const [type, setType] = useState<AccountTypeInput>(initial.type);

  const action =
    mode === "edit" && initial.id
      ? updateAccount.bind(null, initial.id)
      : createAccount;

  const [state, formAction, pending] = useActionState<
    ActionResult<null> | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) onSuccess();
    return result;
  }, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama akun</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={initial.name}
          placeholder="Mis. BCA Tahapan, GoPay, Tunai"
          aria-invalid={!!state?.fieldErrors?.name}
        />
        {state?.fieldErrors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Tipe akun</Label>
        <Select value={type} onValueChange={(v) => setType(v as AccountTypeInput)} name="type" required>
          <SelectTrigger id="type" aria-invalid={!!state?.fieldErrors?.type}>
            <SelectValue placeholder="Pilih tipe" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.fieldErrors?.type?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.type[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="icon">Ikon (opsional)</Label>
          <Input
            id="icon"
            name="icon"
            maxLength={8}
            defaultValue={initial.icon ?? ""}
            placeholder="🏦"
            aria-invalid={!!state?.fieldErrors?.icon}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Warna</Label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Pilih warna ${c}`}
                aria-pressed={color === c}
                className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                  color === c
                    ? "border-foreground scale-110"
                    : "border-transparent hover:border-border"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <input type="hidden" name="color" value={color} />
        </div>
      </div>

      {mode === "create" ? (
        <div className="space-y-1.5">
          <Label htmlFor="startingBalance">Saldo awal</Label>
          <Input
            id="startingBalance"
            name="startingBalance"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue="0"
            aria-invalid={!!state?.fieldErrors?.startingBalance}
          />
          <p className="text-xs text-muted-foreground">
            Saldo akan dihitung ulang dari transaksi setelah ini.
          </p>
          {state?.fieldErrors?.startingBalance?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.startingBalance[0]}
            </p>
          ) : null}
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial.isActive}
            className="w-4 h-4 accent-primary"
          />
          <span>Akun aktif</span>
          <span className="ml-1 text-xs text-muted-foreground">
            (akun nonaktif disembunyikan dari dashboard)
          </span>
        </label>
      )}

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {mode === "edit" ? "Simpan perubahan" : "Tambah akun"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
