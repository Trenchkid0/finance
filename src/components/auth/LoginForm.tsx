"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";

/**
 * Client-side login form. Uses `useActionState` so server errors render
 * inline. Disabled state during submit prevents double-submits and is
 * the only feedback motion AGENTS.md §4.7 allows on a form button.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue="demo@maybe.local"
        error={state?.fieldErrors?.email?.[0]}
      />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        defaultValue="password123"
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
        Masuk
      </button>

      <p className="text-xs text-text-muted text-center">
        Belum punya akun?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Daftar
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
  defaultValue?: string;
  error?: string;
}

function Field({ label, name, type = "text", autoComplete, defaultValue, error }: FieldProps) {
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
        defaultValue={defaultValue}
        aria-invalid={!!error}
        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
      />
      {error ? <p className="mt-1 text-xs text-expense">{error}</p> : null}
    </div>
  );
}
