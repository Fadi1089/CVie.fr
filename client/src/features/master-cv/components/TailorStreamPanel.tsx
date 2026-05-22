import type { useMasterCvTailor } from "../hooks/useMasterCvTailor";

type TailorState = ReturnType<typeof useMasterCvTailor>;

export function TailorStreamPanel({
  events,
  phase,
  error,
  onCancel,
}: Pick<TailorState, "events" | "phase" | "error"> & { onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Adaptation IA en cours"
      className="flex flex-col gap-2 p-4"
    >
      <p className="font-display text-lg">Préparation de votre CV…</p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {events.map((e, i) => (
          <li key={i}>✓ {e.summary}</li>
        ))}
        {phase === "streaming" && (
          <li className="text-[var(--color-ink-soft)]">⋯</li>
        )}
      </ul>
      {phase === "error" && error && (
        <p className="text-sm text-red-600">Erreur : {error}</p>
      )}
      {phase === "streaming" && (
        <button
          type="button"
          onClick={onCancel}
          className="self-end text-xs underline"
        >
          Annuler
        </button>
      )}
    </div>
  );
}
