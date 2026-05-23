import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely. Last conflicting class wins.
 * AGENTS.md §5.4 — utility location convention.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
