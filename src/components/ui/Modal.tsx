"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Lightweight modal built on the native `<dialog>` element. Avoids
 * adding a Radix dependency just for one form. Closes on Escape and
 * on backdrop click.
 *
 * AGENTS.md §4.5: card-style surface, no shadows, border only.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Backdrop click handler — clicking outside the dialog content closes it.
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className="
        bg-surface text-text-primary
        border border-border rounded-lg
        max-w-lg w-[calc(100%-2rem)] p-0
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        open:animate-fade-in
      "
    >
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-base font-medium text-text-primary">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-elevated transition-all duration-200"
        >
          <X size={16} />
        </button>
      </header>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
