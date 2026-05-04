import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";

export function LogoutButton({ className }: { className?: string }) {
  const { logout } = useAuth0();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        // Unmount the editor before signing out so its RHF form state goes
        // with it. Otherwise the editor stays mounted across the Auth0
        // round-trip (or local-logout no-op) and bfcache restores the
        // populated form on reload — defeating any localStorage clear.
        navigate("/", { replace: true });
        logout({ logoutParams: { returnTo: window.location.origin } });
      }}
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
