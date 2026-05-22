import { useEffect, useRef, useState } from "react";
import {
  AI_MODELS,
  AI_PROVIDERS,
  PROVIDER_LABELS,
  defaultModelFor,
  findModel,
  type AiFeature,
  type AiProvider,
} from "@cvie/shared";
import { useAiKeys } from "@/features/settings/ai-keys/hooks/useAiKeys";
import { useAiPreferences } from "@/features/settings/hooks/useAiPreferences";

export function ModelPickerPill({ feature = "cvAssistant" }: { feature?: AiFeature } = {}) {
  const prefs = useAiPreferences();
  const keys = useAiKeys();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = prefs.findFor(feature);
  const provider: AiProvider = current?.provider ?? AI_PROVIDERS[0];
  const modelId = current?.model ?? defaultModelFor(provider);
  const label = findModel(provider, modelId)?.label ?? modelId;
  const loading = prefs.loading || keys.loading;
  const configuredProviders = new Set(keys.keys.map((k) => k.provider));

  function select(p: AiProvider, m: string) {
    setOpen(false);
    void prefs.upsert(feature, p, m);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[14px] border border-[var(--color-rule)] bg-[var(--color-paper-soft,#fafaf7)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Modèle IA"
      >
        <span className="max-w-[140px] truncate">
          {loading ? "Chargement…" : label}
        </span>
        <svg viewBox="0 0 8 5" className="h-1 w-2 fill-current" aria-hidden>
          <path d="M0 0h8L4 5z" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-2 max-h-72 w-[260px] overflow-y-auto rounded-md border border-[var(--color-rule)] bg-white p-1 shadow-lg"
        >
          {AI_PROVIDERS.map((p) => {
            const hasKey = configuredProviders.has(p);
            return (
              <div key={p} className="px-1 py-1">
                <div className="font-mono-caps mb-1 px-1 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
                  {PROVIDER_LABELS[p]}
                  {hasKey ? "" : " · clé serveur"}
                </div>
                {AI_MODELS[p].map((m) => {
                  const selected = p === provider && m.id === modelId;
                  return (
                    <button
                      key={`${p}-${m.id}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => select(p, m.id)}
                      className={`flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--color-paper-soft,#fafaf7)] ${
                        selected ? "bg-[var(--color-paper-soft,#fafaf7)]" : ""
                      }`}
                    >
                      <span className="font-medium text-[var(--color-ink)]">
                        {m.label}
                        {selected ? " · ✓" : ""}
                      </span>
                      <span className="text-[10px] text-[var(--color-ink-soft)]">
                        {m.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
