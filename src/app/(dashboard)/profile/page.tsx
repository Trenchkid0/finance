import Image from "next/image";
import { Calendar, CreditCard, Receipt, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils/formatters";
import { Card } from "@/components/ui/card";

/**
 * Profile page — Server Component.
 * Fetches profile metadata and lightweight activity counts.
 */
export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [dbUser, accountsCount, transactionsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true, image: true },
    }),
    prisma.financeAccount.count({ where: { userId, isActive: true } }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  if (!dbUser) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Profil pengguna tidak ditemukan.
        </p>
      </Card>
    );
  }

  const userInitials = dbUser.name
    ? dbUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold text-foreground mb-1">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Identitas akun Anda dan ringkasan aktivitas pencatatan keuangan.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {dbUser.image ? (
            <Image
              src={dbUser.image}
              alt={dbUser.name ?? "Avatar"}
              width={80}
              height={80}
              unoptimized
              className="w-20 h-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold text-2xl flex items-center justify-center">
              {userInitials}
            </div>
          )}

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-medium text-foreground">
              {dbUser.name ?? "Pengguna"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{dbUser.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-muted-foreground mt-3">
              <Calendar size={13} />
              <span>Terdaftar sejak {formatDate(dbUser.createdAt)}</span>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActivityCard
          icon={<CreditCard size={18} />}
          label="Akun keuangan"
          value={`${accountsCount} terdaftar`}
        />
        <ActivityCard
          icon={<Receipt size={18} />}
          label="Total transaksi"
          value={`${transactionsCount} catatan`}
        />
      </section>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck size={12} />
        Data Anda dienkripsi dan hanya dapat diakses melalui akun terverifikasi.
      </p>
    </div>
  );
}

function ActivityCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-base font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </Card>
  );
}
