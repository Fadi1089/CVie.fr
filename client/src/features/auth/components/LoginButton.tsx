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
    <div
      className="flex items-center gap-3 overflow-hidden"
      title={compact ? "Se connecter" : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        title="Se connecter"
        aria-label="Se connecter"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-rule)] bg-white/85 text-[var(--color-ink)] hover:bg-white"
      >
        <LogIn className="h-4 w-4" aria-hidden />
      </button>
      <span
        className={cn(
          "truncate text-[13px] text-[var(--color-ink)]",
          compact && "hidden",
        )}
      >
        Se connecter
      </span>
    </div>
  );
}
