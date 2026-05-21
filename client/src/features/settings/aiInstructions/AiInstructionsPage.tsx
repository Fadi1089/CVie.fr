import { useAiInstructions } from "./useAiInstructions";

export function AiInstructionsPage() {
  const { text, status, update, flush } = useAiInstructions();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl tracking-tight">Instructions IA</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        Ces consignes sont ajoutées au prompt système de l'assistant CV et du
        générateur Master CV. Elles s'appliquent à toutes les opérations IA.
      </p>
      <textarea
        className="mt-6 h-64 w-full rounded-lg border border-[var(--color-rule)] bg-white/60 p-4 text-[14px]"
        value={text}
        maxLength={4000}
        onChange={(e) => update(e.target.value)}
        aria-label="Instructions IA"
      />
      <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--color-ink-soft)]">
        <span>{text.length} / 4000</span>
        <span>
          {status === "saving" ? "Enregistrement…" : status === "error" ? "Erreur" : "Enregistré"}
        </span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => update("")}
          className="rounded-full px-4 py-2 text-[12px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Effacer
        </button>
        <button
          type="button"
          onClick={() => flush()}
          className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
