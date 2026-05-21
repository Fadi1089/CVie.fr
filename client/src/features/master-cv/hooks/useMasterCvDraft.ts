import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MasterCvData } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";
import { createMasterCvStore } from "../store/masterCvStore";

type Status = "idle" | "saving" | "saved" | "offline" | "error";

export function useMasterCvDraft(initial: MasterCvData) {
  const { fetch } = useAuthApi();
  const store = useMemo(() => createMasterCvStore(fetch), [fetch]);

  const [data, setData] = useState<MasterCvData>(initial);
  const [status, setStatus] = useState<Status>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const backoffRef = useRef(1000);

  const flush = useCallback(
    async (next: MasterCvData) => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      setStatus("saving");
      try {
        await store.save(next);
        setStatus("saved");
        backoffRef.current = 1000;
      } catch {
        setStatus("offline");
        const delay = Math.min(backoffRef.current * 2, 30_000);
        backoffRef.current = delay;
        retryRef.current = setTimeout(() => {
          void flush(next);
        }, delay);
      }
    },
    [store],
  );

  // Cleanup debounce and retry timers on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  const update = useCallback(
    (next: MasterCvData) => {
      setData(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        inflight.current = flush(next);
      }, 300);
    },
    [flush],
  );

  // Re-attempt save when the browser comes back online after an offline failure.
  // Note: this effect re-attaches on every `data` change (each keystroke triggers
  // a new listener bind/unbind). Acceptable per spec — no correctness issue.
  useEffect(() => {
    const onOnline = () => {
      if (status === "offline") void flush(data);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [status, data, flush]);

  return { data, status, update };
}
