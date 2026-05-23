"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Optional numeric badge — count of related resources. */
  badge?: number;
  /** Tone untuk badge. Default neutral. `warning` = ada masalah (mis. saldo minus). */
  badgeTone?: "neutral" | "warning";
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /** Counts surfaced as nav badges. Hidden when 0. */
  counts?: {
    accounts?: number;
    transactions?: number;
    /** Akun dengan saldo ≤ 0 — surface sebagai warning badge supaya user tahu. */
    accountsAtRisk?: number;
  };
}

/**
 * App-shell sidebar — dashboard-01 shape: brand header, three nav
 * groups, user dropdown footer. The earlier BudgetCallout card was
 * removed since the same destination already lives in the analytics
 * nav group (Poin 15 audit — no point in two CTAs to the same place).
 */
export function AppSidebar({ user, counts, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  const navMain: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/accounts",
      label: "Akun",
      icon: Wallet,
      badge: counts?.accounts && counts.accounts > 0 ? counts.accounts : undefined,
    },
    {
      href: "/transactions",
      label: "Transaksi",
      icon: ArrowLeftRight,
      badge:
        counts?.transactions && counts.transactions > 0
          ? counts.transactions
          : undefined,
    },
  ];

  const navAnalytics: NavItem[] = [
    { href: "/income", label: "Pemasukan", icon: TrendingUp },
    { href: "/expenses", label: "Pengeluaran", icon: TrendingDown },
    { href: "/budget", label: "Anggaran", icon: PiggyBank },
  ];

  const navPrefs: NavItem[] = [
    { href: "/settings", label: "Pengaturan", icon: Settings },
    { href: "/profile", label: "Profil", icon: User },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Maybe Finance"
              className="!p-1.5"
            >
              <Link href="/">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold"
                  aria-hidden
                >
                  M
                </span>
                <span className="text-base font-semibold tracking-tight">
                  Maybe Finance
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Menu Utama" items={navMain} pathname={pathname} />
        <NavGroup
          label="Analisis & Anggaran"
          items={navAnalytics}
          pathname={pathname}
        />
        <NavGroup
          label="Preferensi"
          items={navPrefs}
          pathname={pathname}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  className,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {typeof item.badge === "number" ? (
                  <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
