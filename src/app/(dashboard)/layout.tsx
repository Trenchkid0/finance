import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAIScanEnabled } from "@/lib/flags";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { QuickAddDialog } from "@/components/transactions/QuickAddDialog";
import { QuickAddFab } from "@/components/transactions/QuickAddFab";
import { QuickAddProvider } from "@/components/transactions/QuickAddProvider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import type { AccountOption, CategoryOption } from "@/components/transactions/TransactionForm";

/**
 * Dashboard shell — dashboard-01 SidebarProvider + SidebarInset layout.
 *
 *  - Reads the `sidebar_state` cookie server-side so the first paint
 *    matches the user's last collapsed/expanded preference.
 *  - Fetches lightweight counts to surface as nav badges plus the data
 *    needed for global Quick-Add and Command Palette (accounts +
 *    categories). One waterfall, used everywhere downstream.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const [accountsCount, transactionsCount, accounts, categories, cookieStore] =
    await Promise.all([
      prisma.financeAccount.count({ where: { userId, isActive: true } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.financeAccount.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        select: { id: true, name: true, type: true, icon: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      cookies(),
    ]);

  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  const user = session?.user ?? { name: null, email: null, image: null };

  const accountOptions: AccountOption[] = accounts;
  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense",
    icon: c.icon,
  }));

  const aiScanEnabled = isAIScanEnabled();
  const canCreate = accounts.length > 0;

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <QuickAddProvider canCreate={canCreate}>
        <AppSidebar
          variant="inset"
          user={user}
          counts={{
            accounts: accountsCount,
            transactions: transactionsCount,
          }}
        />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
              {children}
            </div>
          </div>
        </SidebarInset>

        {/* Global overlays — di bawah SidebarInset supaya tidak ikut lebar inset. */}
        <CommandPalette accounts={accounts} />
        <QuickAddDialog
          accounts={accountOptions}
          categories={categoryOptions}
          aiScanEnabled={aiScanEnabled}
        />
        <QuickAddFab />
      </QuickAddProvider>
    </SidebarProvider>
  );
}
