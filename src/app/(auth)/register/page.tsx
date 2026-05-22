import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h1 className="text-xl font-medium text-text-primary mb-1">Daftar</h1>
      <p className="text-sm text-text-muted mb-6">
        Buat akun gratis untuk mulai mencatat keuangan Anda.
      </p>
      <RegisterForm />
    </div>
  );
}
