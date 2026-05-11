import { useState } from "react";
import { AI_PROVIDERS, type AiProvider } from "@cvie/shared";
import { useAiKeys } from "../hooks/useAiKeys";
import { ProviderRow } from "../components/ProviderRow";
import { EditKeyModal } from "../components/EditKeyModal";

export function AiKeysPage() {
  const { keys, loading, error, upsert, remove } = useAiKeys();
  const [editing, setEditing] = useState<AiProvider | null>(null);

  function recordFor(provider: AiProvider) {
    return keys.find((k) => k.provider === provider) ?? null;
  }

  return (
    <section>
      <header className="mb-8">
        <p className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
          Chiffrement AES-256-GCM
        </p>
        <h2 className="mt-2 font-display text-[28px] leading-[1] tracking-[-0.02em]">
          Clés API
        </h2>
        <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          Vos clés sont chiffrées au repos et ne sont jamais renvoyées en
          clair par le serveur. Quand une clé est configurée, elle remplace
          la clé serveur partagée pour vos requêtes IA.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-6 border-l-2 border-red-500 bg-red-50/60 px-4 py-3 text-[13px] text-red-700"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Chargement…
        </p>
      ) : (
        <div className="border-t border-[var(--color-rule)]">
          {AI_PROVIDERS.map((provider) => (
            <ProviderRow
              key={provider}
              provider={provider}
              record={recordFor(provider)}
              onEdit={() => setEditing(provider)}
              onDelete={() => void remove(provider)}
            />
          ))}
        </div>
      )}

      {editing ? (
        <EditKeyModal
          provider={editing}
          onSubmit={async (key) => {
            await upsert(editing, key);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
