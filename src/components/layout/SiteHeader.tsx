"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuickAdd } from "@/components/transactions/QuickAddProvider";
import { openCommandPalette } from "@/components/command-palette/CommandPalette";

/**
 * Sticky top bar — sidebar trigger + global actions.
 *
 *   - Search button → membuka command palette (Cmd+K)
 *   - Tambah button → membuka quick-add dialog (shortcut: N)
 *
 * Page title sengaja tidak dipasang di sini karena setiap page sudah
 * render <h1>-nya sendiri (audit poin 2 — hindari duplikasi visual).
 */
export function SiteHeader() {
  const { open: openQuickAdd, canCreate } = useQuickAdd();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex w-full items-center gap-2 px-3 lg:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 h-4 data-[orientation=vertical]:h-4"
        />

        {/* Search trigger — bukan input asli, klik untuk buka command palette.
            Hint shortcut "⌘K" terlihat di kanan supaya user paham. */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 h-7 px-2 rounded-md border border-border bg-elevated text-xs text-muted-foreground hover:text-foreground hover:border-[#444C56] transition-colors w-56 lg:w-72"
          aria-label="Buka pencarian cepat"
        >
          <Search size={12} />
          <span className="flex-1 text-left">Cari halaman, akun…</span>
          <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {/* Mobile-only icon search */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cari"
            className="h-7 w-7 md:hidden"
            onClick={openCommandPalette}
          >
            <Search size={14} />
          </Button>

          <Button
            size="sm"
            onClick={openQuickAdd}
            disabled={!canCreate}
            title={
              canCreate
                ? "Tambah transaksi (N)"
                : "Tambahkan akun terlebih dahulu"
            }
            className="h-7 gap-1.5"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
