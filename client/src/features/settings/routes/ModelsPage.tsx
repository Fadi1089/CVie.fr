import { useState } from "react";
import {
  AI_FEATURES,
  AI_FEATURE_DESCRIPTIONS,
  AI_FEATURE_LABELS,
  AI_MODELS,
  AI_PROVIDERS,
  PROVIDER_LABELS,
  defaultModelFor,
  isValidModel,
  type AiFeature,
  type AiProvider,
} from "@cvie/shared";
import { useAiKeys } from "../ai-keys/hooks/useAiKeys";
import { useAiPreferences } from "../hooks/useAiPreferences";

export function ModelsPage() {
  const keys = useAiKeys();
  const prefs = useAiPreferences();

  return (
    <section>
      <header className="mb-8">
        <p className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
          Sélection par fonctionnalité
        </p>
        <h2 className="mt-2 font-display text-[28px] leading-[1] tracking-[-0.02em]">
          Modèles
        </h2>
        <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          Choisissez quel modèle alimente chaque fonctionnalité IA. Si aucune
          clé n'est configurée pour un fournisseur, ses modèles restent
          désactivés.
        </p>
      </header>

      {prefs.error ? (
        <div
          role="alert"
          className="mb-6 border-l-2 border-red-500 bg-red-50/60 px-4 py-3 text-[13px] text-red-700"
        >
          {prefs.error}
        </div>
      ) : null}

      {prefs.loading || keys.loading ? (
        <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Chargement…
        </p>
      ) : (
        <div className="border-t border-[var(--color-rule)]">
          {AI_FEATURES.map((feature) => (
            <FeatureRow
              key={feature}
              feature={feature}
              current={prefs.findFor(feature)}
              configuredProviders={
                new Set(keys.keys.map((k) => k.provider))
              }
              onSave={(provider, model) =>
                prefs.upsert(feature, provider, model)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

type FeatureRowProps = {
  feature: AiFeature;
  current: { provider: AiProvider; model: string } | null;
  configuredProviders: Set<AiProvider>;
  onSave: (provider: AiProvider, model: string) => Promise<unknown>;
};

function FeatureRow({
  feature,
  current,
  configuredProviders,
  onSave,
}: FeatureRowProps) {
  const initialProvider: AiProvider = current?.provider ?? AI_PROVIDERS[0];
  const initialModel = current?.model ?? defaultModelFor(initialProvider);

  const [provider, setProvider] = useState<AiProvider>(initialProvider);
  const [model, setModel] = useState<string>(initialModel);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function changeProvider(next: AiProvider) {
    setProvider(next);
    const nextModel = isValidModel(next, model) ? model : defaultModelFor(next);
    setModel(nextModel);
    void persist(next, nextModel);
  }

  function changeModel(next: string) {
    setModel(next);
    void persist(provider, next);
  }

  async function persist(p: AiProvider, m: string) {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onSave(p, m);
      setSaved(true);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const providerHasKey = configuredProviders.has(provider);

  return (
    <div className="border-b border-[var(--color-rule)] py-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[var(--color-ink)]">
            {AI_FEATURE_LABELS[feature]}
          </p>
          <p className="mt-1 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
            {AI_FEATURE_DESCRIPTIONS[feature]}
          </p>
        </div>
        <span
          className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]"
          aria-live="polite"
        >
          {saving
            ? "Enregistrement…"
            : saveError
              ? "Échec"
              : saved
                ? "Enregistré"
                : current
                  ? "Configuré"
                  : "Par défaut"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            Fournisseur
          </span>
          <select
            value={provider}
            onChange={(e) => changeProvider(e.target.value as AiProvider)}
            className="border border-[var(--color-rule)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          >
            {AI_PROVIDERS.map((p) => {
              const hasKey = configuredProviders.has(p);
              return (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                  {hasKey ? "" : " · clé serveur"}
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            Modèle
          </span>
          <select
            value={model}
            onChange={(e) => changeModel(e.target.value)}
            className="border border-[var(--color-rule)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          >
            {AI_MODELS[provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!providerHasKey ? (
        <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">
          Aucune clé configurée pour {PROVIDER_LABELS[provider]} — la clé
          serveur partagée sera utilisée tant que vous n'en ajoutez pas une.
        </p>
      ) : null}

      {saveError ? (
        <p role="alert" className="mt-3 text-[12px] text-red-700">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
