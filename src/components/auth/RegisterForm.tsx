"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { register } from "@/app/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="Nama"
        name="name"
        autoComplete="name"
        error={state?.fieldErrors?.name?.[0]}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state?.fieldErrors?.email?.[0]}
      />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Minimal 8 karakter"
        error={state?.fieldErrors?.password?.[0]}
      />

      {state?.error && !state.fieldErrors ? (
        <p className="text-xs text-expense">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-3 py-2 rounded-md text-sm bg-accent text-white hover:bg-blue-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Daftar
      </button>

      <p className="text-xs text-text-muted text-center">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
}

function Field({ label, name, type = "text", autoComplete, hint, error }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs text-text-muted mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
      />
      {hint && !error ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-expense">{error}</p> : null}
    </div>
  );
}
