import type { CertificationEntry } from "@cvie/shared";
import { TagsInput } from "../TagsInput";

function newCertId() {
  return `mcert_${Math.random().toString(16).slice(2, 10)}`;
}

const MAX_CERTIFICATIONS = 30;

export function CertificationsSection({
  value,
  onChange,
}: {
  value: CertificationEntry[];
  onChange: (next: CertificationEntry[]) => void;
}) {
  const atCap = value.length >= MAX_CERTIFICATIONS;
  const add = () => {
    if (atCap) return;
    onChange([
      ...value,
      { id: newCertId(), name: "Nouvelle certification", issuer: "", tags: [] },
    ]);
  };
  const update = (i: number, patch: Partial<CertificationEntry>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <section className="mt-8">
      <header className="flex items-center justify-between">
        <h2 className="font-mono-caps text-[11px] tracking-[0.18em]">CERTIFICATIONS</h2>
        <button
          type="button"
          onClick={add}
          disabled={atCap}
          className="text-xs underline disabled:no-underline disabled:opacity-50"
        >
          + Certification
        </button>
      </header>
      {value.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">Aucune certification pour le moment.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {value.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-[var(--color-rule)] p-4">
              <input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                maxLength={500}
                aria-label="Nom de la certification"
                placeholder="Nom de la certification"
                className="w-full bg-transparent font-display text-lg outline-none"
              />
              <input
                value={c.issuer}
                onChange={(e) => update(i, { issuer: e.target.value })}
                maxLength={500}
                aria-label="Émetteur"
                placeholder="Émetteur"
                className="mt-1 w-full bg-transparent text-sm outline-none"
              />
              <input
                type="month"
                value={c.date ?? ""}
                onChange={(e) => update(i, { date: e.target.value })}
                aria-label="Date d'obtention"
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
              <input
                value={c.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value })}
                maxLength={2000}
                aria-label="URL de la certification"
                placeholder="URL"
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
              <div className="mt-3">
                <p className="font-mono-caps text-[10px] tracking-[0.18em]">TAGS</p>
                <div className="mt-1">
                  <TagsInput value={c.tags} onChange={(tags) => update(i, { tags })} max={20} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-3 text-xs text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
