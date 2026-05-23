import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Empty state — AGENTS.md §4.7 mandates icon + heading + description
 * + (optional) CTA on every empty list/table/chart. This component
 * standardises the layout so we stop diverging across pages.
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA button (or any node — usually a `<Button>`). */
  action?: React.ReactNode;
  /** Visual size — `sm` for inline contexts (e.g. inside a card),
   *  `md` for full-page table empties. Defaults to `md`. */
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const padding = size === "sm" ? "py-8" : "py-12";

  return (
    <div className={cn("flex flex-col items-center text-center", padding, className)}>
      {Icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-muted-foreground">
          <Icon size={18} />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
