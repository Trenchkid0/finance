import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Button — shadcn-style with variants tuned to AGENTS.md §4.5.
 *
 * Variants:
 *   - default     primary CTA  (bg-primary)
 *   - secondary   neutral      (bg-elevated + border)
 *   - destructive expense tone (translucent red)
 *   - outline     same as secondary but transparent at rest
 *   - ghost       icon buttons / nav items
 *   - link        inline link styled as text
 *
 * Sizes match shadcn defaults; `icon` is square 36×36 for consistency.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-blue-500 hover:shadow-[0_4px_12px_rgba(56,139,253,0.22)] active:scale-[0.98]",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-elevated active:scale-[0.98]",
        secondary:
          "bg-elevated border border-border text-foreground hover:bg-[#2D333B] active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-elevated active:scale-[0.97]",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
