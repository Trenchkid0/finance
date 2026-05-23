import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  wallet: "E-wallet",
  cash: "Tunai",
  investment: "Investasi",
};

/**
 * Account detail — last 50 related transactions plus saldo + tipe.
 * Bukan placeholder lagi: minimal viable detail per Poin 18.
 */
export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { id } = await params;

  const account = await prisma.financeAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    notFound();
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [{ accountId: id }, { transferToId: id }],
    },
    include: {
      category: { select: { name: true, icon: true } },
      account: { select: { name: true } },
      transferTo: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/accounts">
            <ArrowLeft size={14} />
            Kembali ke daftar akun
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">
            {account.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ACCOUNT_TYPE_LABEL[account.type] ?? account.type}
            {account.isActive ? "" : " · Nonaktif"}
          </p>
        </div>
      </header>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Saldo saat ini
        </p>
        <p className="text-3xl font-semibold font-mono tabular-nums text-foreground mt-1">
          {formatIDR(Number(account.balance))}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-foreground">
            Transaksi terkait (50 terbaru)
          </h2>
          {transactions.length > 0 ? (
            <Link
              href={`/transactions?accountId=${id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Lihat semua
            </Link>
          ) : null}
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Belum ada transaksi"
            description="Transaksi yang melibatkan akun ini akan tampil di sini."
            size="sm"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="py-2.5">Tanggal</th>
                  <th className="py-2.5">Deskripsi</th>
                  <th className="py-2.5 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const amount = Number(tx.amount);
                  const isIncoming =
                    tx.type === "income" ||
                    (tx.type === "transfer" && tx.transferToId === id);
                  const isOutgoing =
                    tx.type === "expense" ||
                    (tx.type === "transfer" && tx.accountId === id);
                  const tone = isIncoming
                    ? "text-income"
                    : isOutgoing
                      ? "text-expense"
                      : "text-foreground";
                  const sign = isIncoming ? "+" : isOutgoing ? "-" : "";

                  const subtitle =
                    tx.type === "transfer"
                      ? tx.accountId === id
                        ? `Transfer → ${tx.transferTo?.name ?? "?"}`
                        : `Transfer ← ${tx.account.name}`
                      : tx.category?.name ?? "Tanpa kategori";

                  return (
                    <tr
                      key={tx.id}
                      className="text-sm text-foreground hover:bg-elevated transition-colors"
                    >
                      <td className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateShort(tx.date)}
                      </td>
                      <td className="py-3">
                        <span className="block">
                          {tx.description ?? subtitle}
                        </span>
                        {tx.description ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {tx.category?.icon ? (
                              <span aria-hidden>{tx.category.icon}</span>
                            ) : null}
                            {subtitle}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`py-3 text-right font-mono tabular-nums font-medium whitespace-nowrap ${tone}`}
                      >
                        {sign}
                        {formatIDR(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
