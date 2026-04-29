import { useEffect } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "sonner";

export function AuthCallback() {
  const { isLoading, error } = useAuth0();

  useEffect(() => {
    if (error) {
      toast.error("Connexion échouée. Réessayez.");
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-soft)]">
        Connexion en cours…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-700">Échec de la connexion.</p>
        <Link to="/" className="text-sm underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Success: Auth0Provider's onRedirectCallback already navigated away.
  return null;
}
