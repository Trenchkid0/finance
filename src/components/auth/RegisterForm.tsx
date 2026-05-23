"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { register } from "@/app/actions/auth";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Score kekuatan password 0..4 — heuristik ringan, dependency-free.
 *
 *   1 length  ≥ 8
 *   2 length ≥ 12 ATAU mix huruf+digit
 *   3 mix huruf+digit+symbol
 *   4 length ≥ 16 dengan upper/lower/digit/symbol
 */
function scorePassword(pw: string): number {
  if (pw.length < 8) return 0;
  let score = 1;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (pw.length >= 12 || variety >= 2) score = 2;
  if (variety >= 3) score = 3;
  if (pw.length >= 16 && variety === 4) score = 4;

  return score;
}

const STRENGTH_META: Record<
  number,
  { label: string; tone: string; bar: number; barClass: string }
> = {
  0: {
    label: "Terlalu pendek",
    tone: "text-muted-foreground",
    bar: 0,
    barClass: "bg-transparent",
  },
  1: { label: "Lemah", tone: "text-destructive", bar: 25, barClass: "bg-destructive" },
  2: { label: "Cukup", tone: "text-warning", bar: 50, barClass: "bg-warning" },
  3: { label: "Kuat", tone: "text-income", bar: 75, barClass: "bg-income" },
  4: {
    label: "Sangat kuat",
    tone: "text-income",
    bar: 100,
    barClass: "bg-income",
  },
};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, undefined);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const score = scorePassword(password);
  const meta = STRENGTH_META[score];

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4" noValidate>
        <FormField
          id="name"
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Mis. Caesa Putra"
          error={state?.fieldErrors?.name?.[0]}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={state?.fieldErrors?.email?.[0]}
        />

        <div className="space-y-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="pr-10"
              aria-invalid={!!state?.fieldErrors?.password?.[0]}
              aria-describedby="password-strength"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div id="password-strength" className="space-y-1" aria-live="polite">
            <div className="h-1 bg-elevated rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  meta.barClass,
                )}
                style={{ width: `${meta.bar}%` }}
              />
            </div>
            <p className="text-xs flex items-center justify-between gap-2">
              <span
                className={cn(
                  "font-medium",
                  password ? meta.tone : "text-muted-foreground",
                )}
              >
                {password ? meta.label : "Minimal 8 karakter"}
              </span>
              {password && score < 3 ? (
                <span className="text-muted-foreground text-[10px] truncate">
                  Tambah huruf besar / angka / simbol
                </span>
              ) : null}
            </p>
          </div>

          {state?.fieldErrors?.password?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.password[0]}
            </p>
          ) : null}
        </div>

        {state?.error && !state.fieldErrors ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{state.error}</p>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Buat akun
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Masuk
        </Link>
      </p>
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}

function FormField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        aria-invalid={!!error}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
