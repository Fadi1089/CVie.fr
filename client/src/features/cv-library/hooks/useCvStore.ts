import { useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";
import { createCvStore } from "../store";
import type { CvStore } from "../store/types";

export function useCvStore(): CvStore {
  const { isAuthenticated, user } = useAuth0();
  const { fetch: authFetch } = useAuthApi();
  return useMemo(() => {
    if (!isAuthenticated || !user?.sub) {
      return createCvStore({ kind: "local" });
    }
    return createCvStore({ kind: "db", sub: user.sub, fetch: authFetch });
    // authFetch is recreated each render but only its identity matters when
    // sub changes; intentionally not depended on to avoid store thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.sub]);
}
