"use client";

import { Plus } from "lucide-react";
import { useQuickAdd } from "./QuickAddProvider";
import { cn } from "@/lib/utils/cn";

/**
 * Floating action button untuk membuka quick-add di mobile.
 *
 * Hanya muncul di breakpoint < md karena di desktop sudah ada tombol
 * "Tambah" di SiteHeader. Posisi bottom-right standar mobile, tidak
 * menutupi konten karena pakai `safe-area-inset-bottom`.
 */
export function QuickAddFab() {
  const { open, canCreate } = useQuickAdd();

  if (!canCreate) return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Tambah transaksi"
      className={cn(
        "md:hidden fixed bottom-4 right-4 z-40",
        "h-12 w-12 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/30",
        "flex items-center justify-center",
        "transition-transform duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Plus size={20} />
    </button>
  );
}
