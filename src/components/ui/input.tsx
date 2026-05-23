import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Input — shadcn pattern, tuned to AGENTS.md §4.5 form spec.
 * Background `elevated`, ring on focus uses our accent token.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground hover:border-text-muted/40",
          "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
          "transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive/40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
