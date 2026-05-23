import Link from "next/link";
import { ArrowLeftRight, Plus, Wallet } from "lucide-react";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Recent transactions block on the dashboard.
 *
 * Tabel ini disamakan gayanya dengan halaman /transactions:
 *  - Header `bg-elevated` dengan label uppercase muted
 *  - Kolom: Tanggal · Deskripsi (dengan badge kategori inline) · Akun · Jumlah
 *  - Hover row `bg-elevated`, divider via `border-b border-border`
 * Sehingga user yang melihat dashboard lalu klik "Lihat semua" tidak kaget
 * dengan layout berbeda.
 */
export interface RecentTransactionItem {
  id: string;
  description: string;
  categoryName: string | null;
  categoryIcon: string | null;
  accountName: string;
  transferToName: string | null;
  date: string;
  amount: number;
  type: "income" | "expense" | "transfer";
}

interface Props {
  transactions: RecentTransactionItem[];
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-medium text-foreground">
          Transaksi terakhir
        </h2>
        <Link
          href="/transactions"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Lihat semua
        </Link>
      </header>

      {transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada transaksi"
          description="Catat transaksi pertama Anda untuk mulai melacak."
          action={
            <Button size="sm" asChild>
              <Link href="/transactions">
                <Plus size={12} />
                Tambah transaksi
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop / tablet: data table — sama persis dengan /transactions */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Tanggal</th>
                  <th className="text-left px-6 py-3">Deskripsi</th>
                  <th className="text-left px-6 py-3 hidden lg:table-cell">
                    Akun
                  </th>
                  <th className="text-right px-6 py-3">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-b-0 hover:bg-elevated transition-colors duration-150"
                  >
                    <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                      {formatDateShort(tx.date)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-foreground">
                          {tx.description}
                        </p>
                        {tx.type === "transfer" ? (
                          <Badge variant="outline" className="font-normal">
                            <ArrowLeftRight size={10} />
                            Transfer → {tx.transferToName ?? "?"}
                          </Badge>
                        ) : tx.categoryName ? (
                          <Badge variant="secondary" className="font-normal">
                            {tx.categoryIcon ? (
                              <span aria-hidden>{tx.categoryIcon}</span>
                            ) : null}
                            {tx.categoryName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal">
                            Tanpa kategori
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {tx.accountName}
                    </td>
                    <td
                      className={`px-6 py-3 text-sm font-mono tabular-nums text-right whitespace-nowrap font-semibold ${amountClass(
                        tx.type,
                      )}`}
                    >
                      {amountPrefix(tx.type)}
                      {formatIDR(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked rows agar tetap mudah dibaca di layar sempit */}
          <ul className="md:hidden divide-y divide-border">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                    {tx.type === "transfer" ? (
                      <>
                        <ArrowLeftRight size={11} />
                        Transfer → {tx.transferToName ?? "?"}
                      </>
                    ) : (
                      <>
                        {tx.categoryIcon ? (
                          <span aria-hidden>{tx.categoryIcon}</span>
                        ) : null}
                        {tx.categoryName ?? "Tanpa kategori"}
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span className="truncate">{tx.accountName}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">
                    {formatDateShort(tx.date)}
                  </p>
                </div>
                <p
                  className={`text-sm font-mono tabular-nums whitespace-nowrap shrink-0 font-semibold ${amountClass(
                    tx.type,
                  )}`}
                >
                  {amountPrefix(tx.type)}
                  {formatIDR(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function amountClass(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "text-income";
  if (type === "expense") return "text-expense";
  return "text-foreground";
}

function amountPrefix(type: "income" | "expense" | "transfer"): string {
  if (type === "income") return "+";
  if (type === "expense") return "-";
  return "";
}
