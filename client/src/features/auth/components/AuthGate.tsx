import type { ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type Props = {
  anon: ReactNode;
  authed: ReactNode;
  loading?: ReactNode;
};

export function AuthGate({ anon, authed, loading = null }: Props) {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <>{loading}</>;
  return <>{isAuthenticated ? authed : anon}</>;
}
