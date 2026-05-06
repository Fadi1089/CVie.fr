import { useAuth0 } from "@auth0/auth0-react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LoginButton({ className, compact = false }: LoginButtonProps) {
  const { loginWithRedirect } = useAuth0();
  const onClick = () =>
    loginWithRedirect({
      appState: { returnTo: window.location.pathname + window.location.search },
    });

  if (className) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <LogIn className="h-4 w-4" aria-hidden />
        {!compact && <span>Se connecter</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title="Se connecter"
        aria-label="Se connecter"
        className="absolute left-1/2 top-1/2 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-rule)] bg-white/85 text-[var(--color-ink)] hover:bg-white"
      >
        <LogIn className="h-4 w-4" aria-hidden />
      </button>
      <span
        className={cn(
          "absolute left-11 right-3 top-1/2 -translate-y-1/2 truncate text-[13px] text-[var(--color-ink)]",
          "transition-opacity duration-[180ms]",
          compact ? "opacity-0" : "opacity-100",
        )}
      >
        Se connecter
      </span>
    </>
  );
}
