import { useState } from "react";
import { createPortal } from "react-dom";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  reassignTargets: Folder[];
  cvCount: number;
  onConfirm: (moveCvsTo: string) => Promise<void>;
  onCancel: () => void;
};

export function DeleteFolderModal({
  folder,
  reassignTargets,
  cvCount,
  onConfirm,
  onCancel,
}: Props) {
  const [target, setTarget] = useState(reassignTargets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-[var(--color-paper)] p-6 shadow-2xl">
        <h2 className="font-display mb-3 text-[20px] tracking-[-0.02em]">
          Supprimer "{folder.name}"&nbsp;?
        </h2>
        <p className="mb-4 text-[13px] text-[var(--color-ink-soft)]">
          Ce dossier contient {cvCount} CV. Choisissez où les
          déplacer&nbsp;:
        </p>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mb-5 w-full rounded-md border border-[var(--color-rule)] bg-white px-3 py-2 text-[13px]"
        >
          {reassignTargets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!target) return;
              setBusy(true);
              try {
                await onConfirm(target);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !target}
            className="rounded-md bg-red-600 px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
