import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Buat akun
        </h1>
        <p className="text-sm text-muted-foreground">
          Mulai catat keuangan dalam kurang dari satu menit.
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
