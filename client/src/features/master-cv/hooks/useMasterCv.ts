import { useEffect, useMemo, useState } from "react";
import type { MasterCvData } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";
import { createMasterCvStore } from "../store/masterCvStore";

type State =
  | { phase: "loading" }
  | { phase: "needs-seed" }
  | { phase: "ready"; data: MasterCvData }
  | { phase: "error"; error: string };

export function useMasterCv() {
  const { fetch } = useAuthApi();
  const store = useMemo(() => createMasterCvStore(fetch), [fetch]);
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    store
      .load()
      .then((data) => {
        if (cancelled) return;
        setState(data ? { phase: "ready", data } : { phase: "needs-seed" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ phase: "error", error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  return {
    state,
    setData: (data: MasterCvData) => setState({ phase: "ready", data }),
    store,
  };
}
