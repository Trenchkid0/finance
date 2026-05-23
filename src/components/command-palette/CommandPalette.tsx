"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Plus,
  PiggyBank,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuickAdd } from "@/components/transactions/QuickAddProvider";

interface AccountQuickEntry {
  id: string;
  name: string;
}

interface Props {
  /** Daftar akun untuk jump cepat ke detail. */
  accounts: AccountQuickEntry[];
}

interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
}

const NAV_ENTRIES: NavEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, keywords: ["beranda", "home"] },
  { href: "/accounts", label: "Akun", icon: Wallet, keywords: ["account", "rekening", "wallet"] },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight, keywords: ["transaction", "history"] },
  { href: "/income", label: "Pemasukan", icon: TrendingUp, keywords: ["income"] },
  { href: "/expenses", label: "Pengeluaran", icon: TrendingDown, keywords: ["expense", "spending"] },
  { href: "/budget", label: "Anggaran", icon: PiggyBank, keywords: ["budget", "limit"] },
  { href: "/settings", label: "Pengaturan", icon: Settings, keywords: ["setting", "kategori"] },
  { href: "/profile", label: "Profil", icon: User, keywords: ["profile", "user"] },
];

/**
 * Command palette — Cmd+K / Ctrl+K untuk navigasi cepat.
 *
 * Dipasang di dashboard layout. Memberikan akses cepat ke:
 *  - "Tambah transaksi" (langsung membuka QuickAddDialog)
 *  - 8 page utama dengan ikon
 *  - List akun user (jump ke `/accounts/:id`)
 *
 * Search default cmdk pakai fuzzy substring match yang case-insensitive,
 * jadi user bisa ketik "trx" → ketemu "Transaksi".
 */
export function CommandPalette({ accounts }: Props) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { open: openQuickAdd, canCreate } = useQuickAdd();

  // Cmd+K / Ctrl+K toggle palette. Sengaja terpisah dari QuickAdd ("n")
  // supaya keduanya bisa hidup bersamaan.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Expose lewat custom event biar SiteHeader bisa membuka tanpa import circular.
  React.useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("command-palette:open", onOpen);
    return () => window.removeEventListener("command-palette:open", onOpen);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function triggerQuickAdd() {
    setOpen(false);
    // Beri waktu dialog command tertutup dulu sebelum buka dialog quick-add
    // — Radix Dialog tidak suka dua dialog terbuka sekaligus dalam render
    // yang sama (focus trap bertabrakan).
    setTimeout(() => openQuickAdd(), 50);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Cari perintah</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-3">
          <CommandInput placeholder="Cari halaman, akun, atau aksi…" />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>

            <CommandGroup heading="Aksi">
              <CommandItem
                onSelect={triggerQuickAdd}
                disabled={!canCreate}
                value="tambah transaksi add new"
              >
                <Plus />
                <span>Tambah transaksi</span>
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Halaman">
              {NAV_ENTRIES.map((nav) => {
                const Icon = nav.icon;
                return (
                  <CommandItem
                    key={nav.href}
                    onSelect={() => go(nav.href)}
                    value={[nav.label, ...(nav.keywords ?? [])].join(" ")}
                  >
                    <Icon />
                    <span>{nav.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {accounts.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Akun">
                  {accounts.map((acc) => (
                    <CommandItem
                      key={acc.id}
                      onSelect={() => go(`/accounts/${acc.id}`)}
                      value={`akun ${acc.name}`}
                    >
                      <Wallet />
                      <span>{acc.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Helper untuk komponen lain (mis. SiteHeader) untuk membuka palette. */
export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("command-palette:open"));
  }
}
