import { useAiInstructions } from "../hooks/useAiInstructions";

export function AiInstructionsPage() {
  const { text, status, update, flush } = useAiInstructions();

  return (
    <section>
      <header className="mb-8">
        <p className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
          Injecté dans le prompt système
        </p>
        <h2 className="mt-2 font-display text-[28px] leading-[1] tracking-[-0.02em]">
          Instructions IA
        </h2>
        <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          Ces consignes sont ajoutées au prompt système de l'assistant CV et du
          générateur Master CV. Elles s'appliquent à toutes les opérations IA.
        </p>
      </header>

      <textarea
        className="h-64 w-full rounded-lg border border-[var(--color-rule)] bg-white/60 p-4 text-[14px]"
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
    </section>
  );
}
