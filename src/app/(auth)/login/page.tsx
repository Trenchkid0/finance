import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Selamat datang kembali
        </h1>
        <p className="text-sm text-muted-foreground">
          Masuk untuk melanjutkan ke dashboard keuangan Anda.
        </p>
      </header>
      <LoginForm />
    </div>
  );
}
