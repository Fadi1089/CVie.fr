import { Button } from "@/components/ui/button";
import type { PendingChange } from "../../hooks/usePendingChanges";

type Props = {
  changes: PendingChange[];
  onKeep: (path: string) => void;
  onRevert: (path: string) => void;
  onKeepAll: () => void;
  onRevertAll: () => void;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  } catch {
    return "[objet]";
  }
}

function formatPath(path: string): string {
  return path
    .replace(/^personalInfo\./, "Profil · ")
    .replace(/^experiences\[(\d+)\]/, "Expérience #$1")
    .replace(/^formations\[(\d+)\]/, "Formation #$1")
    .replace(/^skills\[(\d+)\]/, "Compétence #$1")
    .replace(/^languages\[(\d+)\]/, "Langue #$1")
    .replace(/^interests\[(\d+)\]/, "Intérêt #$1")
    .replace(/\.bullets\[(\d+)\]/, " · puce #$1");
}

export function PendingChangesHeader({
  changes,
  onKeep,
  onRevert,
  onKeepAll,
  onRevertAll,
}: Props) {
  if (changes.length === 0) return null;
  return (
    <div className="border-b border-[var(--color-rule)] bg-[var(--color-paper-soft,#fbf7f0)] px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          {changes.length} changement{changes.length > 1 ? "s" : ""} en attente
        </span>
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={onRevertAll}>
            Tout annuler
          </Button>
          <Button size="xs" variant="default" onClick={onKeepAll}>
            Tout garder
          </Button>
        </div>
      </div>
      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
        {changes.map((c) => (
          <li
            key={c.path}
            className="rounded-md border border-[var(--color-rule)] bg-white px-2 py-1.5 text-[12px]"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono-caps truncate text-[10px] text-[var(--color-ink-soft)]">
                {formatPath(c.path)}
              </span>
              <div className="flex items-center gap-1">
                <Button size="xs" variant="ghost" onClick={() => onRevert(c.path)}>
                  Annuler
                </Button>
                <Button size="xs" variant="outline" onClick={() => onKeep(c.path)}>
                  Garder
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              <div className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">
                {formatValue(c.before)}
              </div>
              <div className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                {formatValue(c.after)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
