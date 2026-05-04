import { useEffect, useRef, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type Props = {
  anon: ReactNode;
  authed: ReactNode;
  loading?: ReactNode;
};

export function AuthGate({ anon, authed, loading = null }: Props) {
  const { isAuthenticated, isLoading } = useAuth0();
  // Pin to last-known slot during silent refresh so the avatar/login button
  // doesn't flash to empty when the SDK re-fetches an access token.
  const lastKnown = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isLoading) lastKnown.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    if (lastKnown.current === true) return <>{authed}</>;
    if (lastKnown.current === false) return <>{anon}</>;
    return <>{loading}</>;
  }
  return <>{isAuthenticated ? authed : anon}</>;
}
