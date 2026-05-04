import { useCallback, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthApi } from "./useAuthApi";

export type Me = {
  id: string;
  email: string;
  username: string | null;
  createdAt: string;
  updatedAt: string;
};

type UseMeResult = {
  me: Me | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useMe(): UseMeResult {
  const { isAuthenticated, isLoading: sdkLoading } = useAuth0();
  const { fetch } = useAuthApi();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me");
      if (!res.ok) throw new Error(`/me failed (${res.status})`);
      setMe((await res.json()) as Me);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetch, isAuthenticated]);

  useEffect(() => {
    if (sdkLoading) return;
    if (!isAuthenticated) {
      setMe(null);
      return;
    }
    void refresh();
  }, [sdkLoading, isAuthenticated, refresh]);

  return { me, loading, error, refresh };
}
