import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountsClient, type AccountItem } from "@/components/accounts/AccountsClient";

/**
 * Accounts page — Server Component.
 * Fetches active user finance accounts and feeds them into the AccountsClient.
 * AGENTS.md §5.2 / §5.3.
 */
export default async function AccountsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await prisma.financeAccount.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  // Map Decimal values to serializable number types for client boundaries
  const accounts: AccountItem[] = rows.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type as "bank" | "wallet" | "cash" | "investment",
    balance: Number(acc.balance),
    color: acc.color,
    icon: acc.icon,
    isActive: acc.isActive,
  }));

  return <AccountsClient accounts={accounts} />;
}
