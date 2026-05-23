import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AccountsClient,
  type AccountRowData,
} from "@/components/accounts/AccountsClient";
import type { AccountTypeInput } from "@/lib/utils/validators";

/**
 * Accounts page — Server Component. Fetches the user's accounts plus
 * a transaction count per account so the UI can flag the ones with
 * history (which can't be hard-deleted).
 */
export default async function AccountsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await prisma.financeAccount.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          transactions: true,
          transfersIn: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const accounts: AccountRowData[] = rows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountTypeInput,
    balance: Number(a.balance),
    color: a.color,
    icon: a.icon,
    isActive: a.isActive,
    transactionCount: a._count.transactions + a._count.transfersIn,
  }));

  return <AccountsClient accounts={accounts} />;
}
