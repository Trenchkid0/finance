"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

/**
 * Logout button — Client Component because it triggers a transition
 * for the pending state. Action is a Server Action that calls
 * `signOut()` and redirects.
 */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Keluar"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
      className="p-2 rounded-md text-text-muted hover:text-expense hover:bg-elevated transition-all duration-200 disabled:opacity-60"
    >
      <LogOut size={16} />
    </button>
  );
}
