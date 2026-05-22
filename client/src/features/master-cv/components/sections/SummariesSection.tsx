import type { MasterSummary } from "@cvie/shared";

function id() { return `msum_${Math.random().toString(16).slice(2, 10)}`; }

export function SummariesSection({
  value,
  onChange,
}: { value: MasterSummary[]; onChange: (next: MasterSummary[]) => void }) {
  const add = () => onChange([...value, { id: id(), label: "Nouveau", text: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<MasterSummary>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <section className="mt-10">
      <header className="flex items-center justify-between">
        <h2 className="font-mono-caps text-[11px] tracking-[0.18em]">RÉSUMÉS</h2>
        <button type="button" onClick={add} className="text-xs underline">+ Variante</button>
      </header>
      <ul className="mt-4 flex flex-col gap-4">
        {value.map((s, i) => (
          <li key={s.id} className="rounded-lg border border-[var(--color-rule)] p-4">
            <div className="flex justify-between">
              <input
                value={s.label}
                onChange={(e) => update(i, { label: e.target.value.slice(0, 64) })}
                className="font-display text-lg w-1/2 outline-none"
                placeholder="Étiquette (ex. Court, Long FR)"
              />
              <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">Supprimer</button>
            </div>
            <textarea
              className="mt-2 h-32 w-full rounded border border-[var(--color-rule)] p-2 text-sm"
              value={s.text}
              maxLength={2000}
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
