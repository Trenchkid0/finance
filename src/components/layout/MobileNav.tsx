"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile navigation bar — Client Component.
 * Fixed at the bottom of the screen on mobile/tablet viewports (< lg).
 */
export function MobileNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/accounts", label: "Akun", icon: Wallet },
    { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
    { href: "/budget", label: "Anggaran", icon: PiggyBank },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border h-16 flex items-center justify-around px-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors duration-150 py-1 px-3 rounded-md",
              isActive
                ? "text-accent font-semibold"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Icon size={18} className={cn(isActive ? "text-accent" : "text-text-muted")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
