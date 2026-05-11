import type { AiProvider } from "@cvie/shared";
import type { AiKeyRecord } from "../hooks/useAiKeys";

const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google Gemini",
};

type Props = {
  provider: AiProvider;
  record: AiKeyRecord | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProviderRow({ provider, record, onEdit, onDelete }: Props) {
  const configured = record !== null;
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-rule)] py-3">
      <div className="flex flex-col">
        <span className="text-[14px] font-medium text-[var(--color-ink)]">
          {PROVIDER_LABEL[provider]}
        </span>
        <span className="text-[12px] text-[var(--color-ink-soft)]">
          {configured
            ? `Configurée · sk-…${record.keyHint}`
            : "Non configurée"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-[var(--color-rule)] px-3 py-1 text-[12px] text-[var(--color-ink)] transition hover:bg-[var(--color-paper-deep)]"
        >
          {configured ? "Modifier" : "Ajouter"}
        </button>
        {configured ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-transparent px-3 py-1 text-[12px] text-[var(--color-ink-soft)] transition hover:text-[#b33d3b]"
            aria-label={`Supprimer la clé ${PROVIDER_LABEL[provider]}`}
          >
            Supprimer
          </button>
        ) : null}
      </div>
    </div>
  );
}
