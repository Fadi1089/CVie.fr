type Props = {
  count: number;
  onKeepAll: () => void;
  onRevertAll: () => void;
};

export function PendingChangesHeader({ count, onKeepAll, onRevertAll }: Props) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-rule)] bg-white px-3.5 py-2.5">
      <span className="text-[12px] font-semibold text-[var(--color-ink)]">
        {count} changement{count > 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRevertAll}
          className="rounded-md border border-red-500 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Tout annuler
        </button>
        <button
          type="button"
          onClick={onKeepAll}
          className="rounded-md border border-emerald-500 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          Tout garder
        </button>
      </div>
    </div>
  );
}
