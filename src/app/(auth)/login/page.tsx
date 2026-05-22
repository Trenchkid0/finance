import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h1 className="text-xl font-medium text-text-primary mb-1">Masuk</h1>
      <p className="text-sm text-text-muted mb-6">
        Lanjutkan ke dashboard keuangan Anda.
      </p>
      <LoginForm />
    </div>
  );
}
