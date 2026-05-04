import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function useAuthApi(): { fetch: AuthFetch } {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const authFetch: AuthFetch = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers);
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers.set("authorization", `Bearer ${token}`);
        } catch {
          // Token fetch failed — let request proceed unauthenticated; caller decides.
        }
      }
      return fetch(input, { ...init, headers });
    },
    [isAuthenticated, getAccessTokenSilently],
  );

  return { fetch: authFetch };
}
