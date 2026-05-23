"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const isDev = process.env.NODE_ENV === "development";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  // Dev: pre-fill akun seed untuk one-click sign-in. Production: kosongkan
  // supaya tidak menampilkan email orang lain di publik.
  const demoEmail = isDev ? "demo@maybe.local" : "";
  const demoPassword = isDev ? "password123" : "";

  return (
    <div className="space-y-5">
      {isDev ? (
        <div className="rounded-md border border-border bg-elevated px-3 py-2.5 flex items-start gap-2">
          <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mode dev — kredensial demo sudah terisi.{" "}
            <span className="font-mono text-foreground">demo@maybe.local</span>
          </p>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={demoEmail}
            placeholder="nama@email.com"
            aria-invalid={!!state?.fieldErrors?.email}
          />
          {state?.fieldErrors?.email?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.email[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Kata sandi</Label>
            <Link
              href="#"
              tabIndex={-1}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors pointer-events-none opacity-60"
              aria-disabled
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              defaultValue={demoPassword}
              className="pr-10"
              aria-invalid={!!state?.fieldErrors?.password}
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
          Masuk
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="text-primary hover:underline font-medium"
        >
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
