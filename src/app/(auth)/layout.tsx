import Link from "next/link";
import { LineChart, Lock, Sparkles } from "lucide-react";

/**
 * Auth route group — split shell untuk /login dan /register.
 *
 * Pola:
 *   - lg+ : dua kolom — brand panel kiri (40%) + form kanan (60%)
 *   - <lg : satu kolom, brand mark + tagline pendek di atas form
 *
 * Brand panel pakai surface elevated polos (bukan gradient/glow) supaya
 * tetap konsisten dengan AGENTS.md §4.1 ("clarity over cleverness").
 * Hanya 3 benefit bullet — copy singkat, bukan landing page mini.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          {/* Brand mark untuk mobile (panel kiri di-hide di <lg). */}
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-2 text-foreground"
            aria-label="Maybe Finance"
          >
            <span
              className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold"
              aria-hidden
            >
              M
            </span>
            <span className="text-base font-semibold tracking-tight">
              Maybe Finance
            </span>
          </Link>

          {children}

          {/* Footer kecil — placeholder untuk Privacy/Terms saat ada. */}
          <p className="text-[11px] text-muted-foreground text-center">
            Dengan melanjutkan, Anda menyetujui penggunaan layanan dan
            pemrosesan data sesuai standar enkripsi industri.
          </p>
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex flex-col justify-between bg-card border-r border-border p-10 xl:p-14"
    >
      <Link href="/" className="inline-flex items-center gap-2 text-foreground">
        <span
          className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-base font-bold"
          aria-hidden
        >
          M
        </span>
        <span className="text-lg font-semibold tracking-tight">
          Maybe Finance
        </span>
      </Link>

      <div className="space-y-8">
        <div className="space-y-3 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-semibold text-foreground leading-tight tracking-tight">
            Pegang kendali penuh atas keuangan Anda.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Catat transaksi dengan cepat, pantau anggaran per kategori, dan
            dapatkan insight bulanan yang mudah dipahami.
          </p>
        </div>

        <ul className="space-y-4">
          <BenefitRow
            icon={<LineChart size={14} />}
            title="Insight bulanan otomatis"
            body="Pemasukan, pengeluaran, dan saldo terlacak rapi dalam satu dashboard."
          />
          <BenefitRow
            icon={<Sparkles size={14} />}
            title="Scan struk dengan AI"
            body="Tempel teks atau foto struk — AI akan mengisi field transaksi untuk Anda."
          />
          <BenefitRow
            icon={<Lock size={14} />}
            title="Data Anda, kendali Anda"
            body="Semua disimpan terenkripsi. Tidak ada iklan, tidak ada penjualan data."
          />
        </ul>
      </div>

      <p className="text-[11px] text-muted-foreground tabular-nums">
        © {new Date().getFullYear()} Maybe Finance · Personal use license
      </p>
    </aside>
  );
}

function BenefitRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-elevated text-muted-foreground border border-border">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
