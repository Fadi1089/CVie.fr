import { useState } from "react";

export type SeedCv = { id: string; title: string; updatedAt: string };

export function SeedingPrompt({
  cvs,
  onSeed,
  onSkip,
  onPdf,
}: {
  cvs: SeedCv[];
  onSeed: (ids: string[]) => void;
  onSkip: () => void;
  onPdf: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div
      role="dialog"
      aria-label="Seed master CV"
      className="mx-auto mt-20 max-w-md rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6"
    >
      <h2 className="font-display text-xl">Importer depuis vos CV existants ?</h2>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        Nous fusionnerons les entrées sélectionnées dans votre nouveau Master CV.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {cvs.map((cv) => (
          <li key={cv.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={picked.has(cv.id)}
                onChange={() => toggle(cv.id)}
              />
              {cv.title}
            </label>
          </li>
        ))}
        <li>
          <button type="button" onClick={onPdf} className="text-sm underline">
            Importer un PDF…
          </button>
        </li>
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="font-mono-caps rounded-full px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          IGNORER
        </button>
        <button
          type="button"
          onClick={() => onSeed([...picked])}
          disabled={picked.size === 0}
          className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-40"
        >
          Importer la sélection
        </button>
      </div>
    </div>
  );
}
