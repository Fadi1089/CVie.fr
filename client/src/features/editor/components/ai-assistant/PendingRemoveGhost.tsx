type Props = {
  label: string;
  sublabel?: string;
  onRevert: () => void;
};

/**
 * Placeholder row for an item the AI suggested to delete. The actual
 * field is already gone from the form (optimistic apply); this ghost is
 * the user-visible trace + the one-click undo.
 */
export function PendingRemoveGhost({ label, sublabel, onRevert }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50/60 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-red-700">
          Supprimé par l'Assistant
        </p>
        <p className="truncate text-[14px] font-medium text-red-900 line-through opacity-80">
          {label}
        </p>
        {sublabel ? (
          <p className="truncate text-[12px] text-red-800/80 line-through opacity-70">
            {sublabel}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRevert}
        className="shrink-0 rounded-md border border-red-500 bg-white px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-50"
      >
        Annuler
      </button>
    </div>
  );
}
