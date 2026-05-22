import type { ProjectEntry } from "@cvie/shared";
import { TagsInput } from "../TagsInput";

function newProjectId() {
  return `mproj_${Math.random().toString(16).slice(2, 10)}`;
}

const MAX_PROJECTS = 40;

export function ProjectsSection({
  value,
  onChange,
}: {
  value: ProjectEntry[];
  onChange: (next: ProjectEntry[]) => void;
}) {
  const atCap = value.length >= MAX_PROJECTS;
  const add = () => {
    if (atCap) return;
    onChange([
      ...value,
      { id: newProjectId(), name: "Nouveau projet", tags: [] },
    ]);
  };
  const update = (i: number, patch: Partial<ProjectEntry>) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <section className="mt-8">
      <header className="flex items-center justify-between">
        <h2 className="font-mono-caps text-[11px] tracking-[0.18em]">PROJETS</h2>
        <button
          type="button"
          onClick={add}
          disabled={atCap}
          className="text-xs underline disabled:no-underline disabled:opacity-50"
        >
          + Projet
        </button>
      </header>
      {value.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">Aucun projet pour le moment.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {value.map((p, i) => (
            <li key={p.id} className="rounded-lg border border-[var(--color-rule)] p-4">
              <input
                value={p.name}
                onChange={(e) => update(i, { name: e.target.value })}
                maxLength={500}
                aria-label="Nom du projet"
                placeholder="Nom du projet"
                className="w-full bg-transparent font-display text-lg outline-none"
              />
              <input
                value={p.role ?? ""}
                onChange={(e) => update(i, { role: e.target.value })}
                maxLength={500}
                aria-label="Rôle"
                placeholder="Rôle"
                className="mt-1 w-full bg-transparent text-sm outline-none"
              />
              <textarea
                value={p.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
                maxLength={2000}
                aria-label="Description"
                placeholder="Description"
                className="mt-2 h-24 w-full rounded border border-[var(--color-rule)] p-2 text-sm"
              />
              <input
                value={p.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value })}
                maxLength={2000}
                aria-label="URL du projet"
                placeholder="URL"
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
              <div className="mt-3">
                <p className="font-mono-caps text-[10px] tracking-[0.18em]">TAGS</p>
                <div className="mt-1">
                  <TagsInput value={p.tags} onChange={(tags) => update(i, { tags })} max={20} />
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
