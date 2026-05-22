import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { auth } from "@/lib/auth";

/**
 * Dashboard shell. Middleware already enforces auth (see `middleware.ts`),
 * so reaching this layout means a session exists. We still call `auth()`
 * to surface the user object to children that need it.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={session?.user ?? null} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
