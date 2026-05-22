import { Bell, Search } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Sticky top bar — glassmorphism (§4.8).
 * Search and notifications are placeholders for now.
 */
export function Topbar({ user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-canvas/80 border-b border-border">
      <div className="h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted">
          <Search size={16} />
          <span className="text-sm">Cari transaksi...</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-elevated transition-all duration-200"
          >
            <Bell size={16} />
          </button>

          {user ? (
            <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-border">
              <div className="text-right leading-tight">
                <p className="text-xs text-text-primary">{user.name ?? "User"}</p>
                <p className="text-[10px] text-text-muted">{user.email}</p>
              </div>
              <LogoutButton />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
