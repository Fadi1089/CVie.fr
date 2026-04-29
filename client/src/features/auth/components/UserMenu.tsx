import { useAuth0 } from "@auth0/auth0-react";
import { LogoutButton } from "./LogoutButton";

export function UserMenu() {
  const { user } = useAuth0();
  if (!user) return null;
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-deep)] text-[11px] font-semibold text-[var(--color-ink)]"
        aria-label={user.email ?? "Profil"}
      >
        {initials}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-[var(--color-ink)]">
          {user.email}
        </span>
        <LogoutButton className="-ml-1 inline-flex items-center gap-1 px-1 py-0 text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]" />
      </div>
    </div>
  );
}
