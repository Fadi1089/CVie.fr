import { useState } from "react";
import type { AnonExport, ImportResult } from "../store/types";

type Props = {
  sub: string;
  anonRecords: AnonExport[];
  onImport: (records: AnonExport[]) => Promise<ImportResult>;
};

const importedKey = (sub: string) => `cvie.migration.imported_ids.${sub}`;
const dismissedKey = (sub: string) => `cvie.migration.dismissed_for.${sub}`;

function readImportedIds(sub: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(importedKey(sub));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr))
      return new Set(arr.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}
function writeImportedIds(sub: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(importedKey(sub), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
function isDismissed(sub: string): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(sub)) === "true";
  } catch {
    return false;
  }
}
function setDismissed(sub: string): void {
  try {
    window.localStorage.setItem(dismissedKey(sub), "true");
  } catch {
    /* ignore */
  }
}

export function ImportLocalCvsModal({ sub, anonRecords, onImport }: Props) {
  const imported = readImportedIds(sub);
  const dismissed = isDismissed(sub);
  const pending = anonRecords.filter((r) => !imported.has(r.id));
  const [open, setOpen] = useState(true);
  const [neverAsk, setNeverAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (dismissed || pending.length === 0 || !open) return null;

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await onImport(pending);
      const next = new Set(imported);
      for (const r of result.imported) next.add(r.oldId);
      writeImportedIds(sub, next);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    if (neverAsk) setDismissed(sub);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importer les CV locaux"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="atelier-paper w-full max-w-md rounded-lg p-6 shadow-2xl">
        <h2 className="font-display mb-3 text-[22px] tracking-[-0.02em]">
          Importer vos CV locaux ?
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          Vous avez {pending.length} CV{" "}
          {pending.length > 1 ? "enregistrés" : "enregistré"} sur cet
          appareil. Voulez-vous{" "}
          {pending.length > 1 ? "les importer" : "l'importer"} dans votre
          compte&nbsp;?
        </p>

        <label className="mb-5 flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={neverAsk}
            onChange={(e) => setNeverAsk(e.target.checked)}
            aria-label="Ne plus me demander"
          />
          Ne plus me demander
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Importation…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}
