"use client";

import * as React from "react";

/**
 * Quick-add bus: jembatan global untuk membuka dialog "Tambah transaksi"
 * dari mana saja (header, FAB, keyboard shortcut). Dialog yang sebenarnya
 * di-render oleh `<QuickAddDialog>` yang membaca state ini.
 *
 * Kenapa context, bukan zustand / window event:
 *   - Hanya ada satu dialog di satu waktu
 *   - State sederhana (open/closed) — tidak perlu library
 *   - Trigger bisa dipasang lewat `useQuickAdd()` hook
 *
 * Komponen yang butuh ngebuka dialog:
 *   const { open } = useQuickAdd();
 *   <Button onClick={open}>Tambah</Button>
 */

interface QuickAddCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** True jika user belum punya akun aktif — tombol harus disabled. */
  canCreate: boolean;
}

const QuickAddContext = React.createContext<QuickAddCtx | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  canCreate: boolean;
}

export function QuickAddProvider({ children, canCreate }: ProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const value = React.useMemo<QuickAddCtx>(
    () => ({
      isOpen,
      canCreate,
      open: () => {
        if (canCreate) setIsOpen(true);
      },
      close: () => setIsOpen(false),
      toggle: () => {
        if (canCreate) setIsOpen((v) => !v);
      },
    }),
    [isOpen, canCreate],
  );

  // Global keyboard shortcut: tekan "n" (selama tidak sedang mengetik
  // di input/textarea/contenteditable) untuk membuka quick-add.
  // Mengikuti pola Cmd+B sidebar yang sudah ada — konsisten.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      if (canCreate) setIsOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canCreate]);

  return (
    <QuickAddContext.Provider value={value}>
      {children}
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd(): QuickAddCtx {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within QuickAddProvider.");
  }
  return ctx;
}
