type Props = {
  before: unknown;
  after: unknown;
  onRevert: () => void;
  onKeep: () => void;
};

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function InlineDiff({ before, after, onRevert, onKeep }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border-l-4 border-red-500 bg-red-50 px-3 py-2 text-[13px] leading-6 text-[var(--color-ink)] whitespace-pre-wrap">
        {renderValue(before)}
      </div>
      <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-[13px] leading-6 text-[var(--color-ink)] whitespace-pre-wrap">
        {renderValue(after)}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onRevert}
          className="rounded-md border border-red-500 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="rounded-md border border-emerald-500 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          Garder
        </button>
      </div>
    </div>
  );
}
