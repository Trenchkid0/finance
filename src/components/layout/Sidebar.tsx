"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop sidebar — Client Component because nav items hold Lucide icon
 * function refs, which can't cross the server→client boundary, and the
 * active-state highlight uses `usePathname()`.
 *
 * Item order mirrors AGENTS.md §4.6 information architecture. Emoji icons
 * shown in that diagram are illustrative; we use Lucide icons in
 * production per §3 ("Icons: Lucide React").
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Akun", icon: Wallet },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/income", label: "Pemasukan", icon: TrendingUp },
  { href: "/expenses", label: "Pengeluaran", icon: TrendingDown },
  { href: "/budget", label: "Anggaran", icon: PiggyBank },
];

const secondaryItems: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Profil", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-surface border-r border-border">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link
          href="/"
          className="text-base font-semibold text-text-primary tracking-tight"
        >
          Maybe Finance
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="my-3 border-t border-border" />

        {secondaryItems.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150",
        isActive
          ? "bg-accent/10 text-accent font-medium border-l-2 border-accent"
          : "text-text-muted hover:text-text-primary hover:bg-elevated border-l-2 border-transparent",
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
