type Props = {
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

export function CardHeader({
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  return (
    <header className="flex items-center justify-between mb-3">
      <span
        className="text-[14px] text-[var(--atelier-accent)] tabular-nums"
        style={{ fontFamily: "var(--atelier-display)" }}
      >
        #{(index + 1).toString().padStart(2, "0")}
      </span>
      <div className="flex gap-2 text-[10px] tracking-[0.18em] text-[var(--atelier-muted)]">
        {canMoveUp && (
          <button type="button" onClick={onMoveUp} aria-label="Déplacer ↑">
            ↑
          </button>
        )}
        {canMoveDown && (
          <button type="button" onClick={onMoveDown} aria-label="Déplacer ↓">
            ↓
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label="Supprimer">
          ×
        </button>
      </div>
    </header>
  );
}
