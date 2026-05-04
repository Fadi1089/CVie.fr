import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Folder } from "../store/types";

type Props = {
  x: number;
  y: number;
  folders: Folder[];
  isInTrash: boolean;
  onMove: (folderId: string) => void;
  onTrash?: () => void;
  onRestore?: (folderId: string) => void;
  onHardDelete?: () => void;
  onClose: () => void;
};

export function CvContextMenu({
  x,
  y,
  folders,
  isInTrash,
  onMove,
  onTrash,
  onRestore,
  onHardDelete,
  onClose,
}: Props) {
  // Close on outside click / Escape.
  useEffect(() => {
    const onDoc = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const targets = folders.filter(
    (f) => !(f.isSystem && f.ttlDays !== null),
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[200px] rounded-md border border-[var(--color-rule)] bg-white py-1 text-[13px] shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {!isInTrash ? (
        <>
          <div className="px-3 py-1 text-[11px] uppercase text-[var(--color-ink-soft)]">
            Déplacer vers
          </div>
          {targets.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              onClick={() => {
                onMove(f.id);
                onClose();
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-rule)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onTrash?.();
              onClose();
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
          >
            Mettre à la corbeille
          </button>
        </>
      ) : (
        <>
          <div className="px-3 py-1 text-[11px] uppercase text-[var(--color-ink-soft)]">
            Restaurer vers
          </div>
          {targets.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              onClick={() => {
                onRestore?.(f.id);
                onClose();
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-rule)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onHardDelete?.();
              onClose();
            }}
            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
          >
            Supprimer définitivement
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
