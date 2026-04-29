import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const { logout } = useAuth0();
  return (
    <button
      type="button"
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      }
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Se déconnecter
    </button>
  );
}
