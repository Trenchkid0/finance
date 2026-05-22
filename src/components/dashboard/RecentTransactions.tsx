import Link from "next/link";
import { Wallet } from "lucide-react";
import { formatDateShort, formatIDR } from "@/lib/utils/formatters";

/**
 * Recent transactions block.
 *
 * Real data type will come from `Prisma.TransactionGetPayload<{ include: ... }>`
 * once the schema lands (AGENTS.md §5.3). Until then this accepts a minimal
 * shape so the dashboard renders end-to-end.
 */
export interface RecentTransactionItem {
  id: string;
  description: string;
  categoryName: string;
  accountName: string;
  date: Date | string;
  amount: number;
  type: "income" | "expense";
}

interface Props {
  transactions: RecentTransactionItem[];
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-medium text-text-primary">
          Transaksi terakhir
        </h2>
        <Link
          href="/transactions"
          className="text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
        >
          Lihat semua
        </Link>
      </header>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-elevated transition-colors duration-150"
            >
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {tx.description}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {tx.categoryName} · {tx.accountName} · {formatDateShort(tx.date)}
                </p>
              </div>
              <p
                className={`text-sm font-mono tabular-nums shrink-0 ${
                  tx.type === "income" ? "text-income" : "text-expense"
                }`}
              >
                {tx.type === "income" ? "+" : "-"}
                {formatIDR(tx.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** AGENTS.md §4.7 — every list/table needs a designed empty state. */
function EmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto w-10 h-10 rounded-full bg-elevated text-text-muted flex items-center justify-center mb-3">
        <Wallet size={18} />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Belum ada transaksi
      </p>
      <p className="text-xs text-text-muted mb-4">
        Catat transaksi pertama Anda untuk mulai melacak.
      </p>
      <Link
        href="/transactions"
        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:bg-blue-500 transition-all duration-200"
      >
        + Tambah transaksi
      </Link>
    </div>
  );
}
