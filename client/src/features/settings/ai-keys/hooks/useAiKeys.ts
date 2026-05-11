import { useCallback, useEffect, useState } from "react";
import type { AiProvider } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

export type AiKeyRecord = {
  provider: AiProvider;
  keyHint: string;
  updatedAt: string;
};

type State = {
  keys: AiKeyRecord[];
  loading: boolean;
  error: string | null;
};

const BASE = "/api/v1/ai-keys";

export function useAiKeys() {
  const { fetch } = useAuthApi();
  const [state, setState] = useState<State>({
    keys: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { keys: AiKeyRecord[] };
      setState({ keys: body.keys, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, [fetch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsert = useCallback(
    async (provider: AiProvider, key: string): Promise<AiKeyRecord> => {
      const res = await fetch(`${BASE}/${provider}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { key: AiKeyRecord };
      setState((s) => {
        const next = s.keys.filter((k) => k.provider !== provider);
        next.push(body.key);
        next.sort((a, b) => a.provider.localeCompare(b.provider));
        return { ...s, keys: next };
      });
      return body.key;
    },
    [fetch],
  );

  const remove = useCallback(
    async (provider: AiProvider): Promise<void> => {
      const res = await fetch(`${BASE}/${provider}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
      setState((s) => ({
        ...s,
        keys: s.keys.filter((k) => k.provider !== provider),
      }));
    },
    [fetch],
  );

  return { ...state, refresh, upsert, remove };
}
