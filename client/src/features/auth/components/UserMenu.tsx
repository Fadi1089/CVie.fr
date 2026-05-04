import { useAuth0 } from "@auth0/auth0-react";
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
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper-deep)] text-[11px] font-semibold text-[var(--color-ink)]"
      aria-label={label}
    >
      {initials}
    </span>
  );

  return (
    <div
      className="flex items-center gap-3 overflow-hidden"
      title={compact ? label : undefined}
    >
      {avatar}
      <div className={cn("flex min-w-0 flex-col", compact && "hidden")}>
        <span className="truncate text-[13px] text-[var(--color-ink)]">
          {user.email}
        </span>
        <LogoutButton className="-ml-1 inline-flex items-center gap-1 px-1 py-0 text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]" />
      </div>
    </div>
  );
}
