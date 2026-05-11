import { useCallback, useEffect, useState } from "react";
import type { AiFeature, AiProvider } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

export type AiPreferenceRecord = {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  updatedAt: string;
};

type State = {
  preferences: AiPreferenceRecord[];
  loading: boolean;
  error: string | null;
};

const BASE = "/api/v1/ai-preferences";

export function useAiPreferences() {
  const { fetch } = useAuthApi();
  const [state, setState] = useState<State>({
    preferences: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { preferences: AiPreferenceRecord[] };
      setState({ preferences: body.preferences, loading: false, error: null });
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
    async (
      feature: AiFeature,
      provider: AiProvider,
      model: string,
    ): Promise<AiPreferenceRecord> => {
      const res = await fetch(`${BASE}/${feature}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { preference: AiPreferenceRecord };
      setState((s) => {
        const next = s.preferences.filter((p) => p.feature !== feature);
        next.push(body.preference);
        return { ...s, preferences: next };
      });
      return body.preference;
    },
    [fetch],
  );

  function findFor(feature: AiFeature): AiPreferenceRecord | null {
    return state.preferences.find((p) => p.feature === feature) ?? null;
  }

  return { ...state, refresh, upsert, findFor };
}
