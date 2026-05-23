"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import { updateTransactionCategory } from "@/app/actions/transactions-quick";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Badge kategori yang bisa di-klik untuk re-categorize transaksi
 * langsung dari list — tanpa buka form full.
 *
 * UX: optimistic update via local state. Kalau server gagal, revert ke
 * value awal dan tampilkan toast error. Kalau sukses, sonner toast
 * info ringan supaya user tahu.
 */

interface CategoryOption {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
}

interface Props {
  transactionId: string;
  type: "income" | "expense" | "transfer";
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  /** Daftar kategori yang relevan (sudah difilter sesuai tipe transaksi). */
  categories: CategoryOption[];
}

export function InlineCategoryPicker({
  transactionId,
  type,
  categoryId,
  categoryName,
  categoryIcon,
  categories,
}: Props) {
  const [pending, startTransition] = useTransition();
  // Optimistic state — langsung update tampilan saat klik supaya
  // tidak ada lag visual sambil tunggu server roundtrip.
  const [optimistic, setOptimistic] = useState<{
    id: string | null;
    name: string | null;
    icon: string | null;
  }>({
    id: categoryId,
    name: categoryName,
    icon: categoryIcon,
  });

  // Transfer tidak punya kategori — render badge polos read-only.
  if (type === "transfer") {
    return null;
  }

  const filtered = categories.filter((c) => c.type === type);

  function pickCategory(option: CategoryOption | null) {
    const previous = optimistic;
    const next = option
      ? { id: option.id, name: option.name, icon: option.icon }
      : { id: null, name: null, icon: null };

    if (next.id === previous.id) return; // No-op kalau sama.

    setOptimistic(next);

    startTransition(async () => {
      const result = await updateTransactionCategory(transactionId, next.id);
      if (!result.ok) {
        // Revert + toast.
        setOptimistic(previous);
        toast.error(result.error ?? "Gagal mengubah kategori.");
      }
    });
  }

  const trigger = optimistic.name ? (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal cursor-pointer hover:bg-elevated transition-colors",
        pending && "opacity-60",
      )}
    >
      {optimistic.icon ? <span aria-hidden>{optimistic.icon}</span> : null}
      <span className="truncate">{optimistic.name}</span>
      {pending ? <Loader2 size={10} className="animate-spin" /> : null}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn(
        "font-normal cursor-pointer hover:bg-elevated transition-colors",
        pending && "opacity-60",
      )}
    >
      Tanpa kategori
      {pending ? <Loader2 size={10} className="animate-spin" /> : null}
    </Badge>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={pending}
        aria-label={`Ubah kategori transaksi`}
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 max-h-[320px] overflow-y-auto"
      >
        {filtered.map((cat) => (
          <DropdownMenuItem
            key={cat.id}
            onSelect={() => pickCategory(cat)}
            className="gap-2"
          >
            <span className="w-4 text-center">{cat.icon ?? "•"}</span>
            <span className="flex-1 truncate">{cat.name}</span>
            {optimistic.id === cat.id ? (
              <Check size={12} className="text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => pickCategory(null)}
          className="text-muted-foreground"
        >
          Tanpa kategori
          {optimistic.id === null ? (
            <Check size={12} className="text-primary ml-auto" />
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Read-only badge untuk transaksi tipe transfer. */
export function TransferBadge({
  transferToName,
}: {
  transferToName: string | null;
}) {
  return (
    <Badge variant="outline" className="font-normal">
      <ArrowLeftRight size={10} />
      Transfer → {transferToName ?? "?"}
    </Badge>
  );
}
