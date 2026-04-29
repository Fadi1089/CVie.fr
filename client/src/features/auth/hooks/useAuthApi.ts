import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function useAuthApi(): { fetch: AuthFetch } {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();

  const redirectToLogin = useCallback(async () => {
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname + window.location.search },
    });
  }, [loginWithRedirect]);

  const authFetch: AuthFetch = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers);
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers.set("authorization", `Bearer ${token}`);
        } catch {
          await redirectToLogin();
          throw new Error("Unauthenticated — redirecting to login.");
        }
      }
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401) {
        await redirectToLogin();
        throw new Error("Unauthenticated — redirecting to login.");
      }
      return res;
    },
    [isAuthenticated, getAccessTokenSilently, redirectToLogin],
  );

  return { fetch: authFetch };
}
