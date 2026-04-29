import { useAuth0 } from "@auth0/auth0-react";
import { LogIn } from "lucide-react";

export function LoginButton({ className }: { className?: string }) {
  const { loginWithRedirect } = useAuth0();
  return (
    <button
      type="button"
      onClick={() =>
        loginWithRedirect({
          appState: { returnTo: window.location.pathname + window.location.search },
        })
      }
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-white/85 px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] hover:bg-white"
      }
    >
      <LogIn className="h-4 w-4" aria-hidden />
      Se connecter
    </button>
  );
}
