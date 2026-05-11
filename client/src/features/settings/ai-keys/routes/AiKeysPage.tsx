import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { AI_PROVIDERS, type AiProvider } from "@cvie/shared";
import { useAiKeys } from "../hooks/useAiKeys";
import { ProviderRow } from "../components/ProviderRow";
import { EditKeyModal } from "../components/EditKeyModal";

export function AiKeysPage() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { keys, loading, error, upsert, remove } = useAiKeys();
  const [editing, setEditing] = useState<AiProvider | null>(null);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  function recordFor(provider: AiProvider) {
    return keys.find((k) => k.provider === provider) ?? null;
  }

  return (
    <div className="atelier-paper min-h-screen px-6 py-10 text-[var(--color-ink)]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <Link
            to="/editor"
            className="font-mono-caps text-[10px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            ← Éditeur
          </Link>
          <h1 className="mt-2 font-display text-[40px] leading-[0.95] tracking-[-0.03em]">
            Clés API IA
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
            Vos clés sont chiffrées au repos (AES-256-GCM) et ne sont jamais
            renvoyées en clair par le serveur. Quand une clé est configurée,
            elle remplace la clé serveur partagée pour vos requêtes IA.
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Chargement…
          </p>
        ) : (
          <div>
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
      </div>
    </div>
  );
}
