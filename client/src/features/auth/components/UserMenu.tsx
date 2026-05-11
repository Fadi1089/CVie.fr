import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./LogoutButton";

type UserMenuProps = {
  compact?: boolean;
};

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user } = useAuth0();
  if (!user) return null;
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  const label = user.email ?? "Profil";
  const avatar = user.picture ? (
    <img
      src={user.picture}
      alt={label}
      referrerPolicy="no-referrer"
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-deep)] text-[11px] font-semibold text-[var(--color-ink)]"
      aria-label={label}
    >
      {initials}
    </span>
  );

  return (
    <>
      <span
        className="absolute left-4 top-1/2 -translate-y-1/2"
        title={compact ? label : undefined}
      >
        {avatar}
      </span>
      <div
        className={cn(
          "absolute left-[60px] right-3 top-1/2 -translate-y-1/2 truncate",
          "transition-opacity duration-[180ms]",
          compact ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="block truncate text-[13px] text-[var(--color-ink)]">
          {user.email}
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            aria-label="Paramètres"
            title="Paramètres"
            className="-ml-1 inline-flex items-center px-1 py-0 text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
          >
            <Settings size={13} strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <LogoutButton className="inline-flex items-center gap-1 px-1 py-0 text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]" />
        </div>
      </div>
    </>
  );
}
