import { useState } from "react";
import { createPortal } from "react-dom";
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

  if (typeof document === "undefined") return null;

  // Inline styles instead of Tailwind so the modal can't be broken by
  // ancestor CSS, missing utility classes, or stale CSS bundles.
  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.3)",
    padding: "1rem",
  };
  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: "28rem",
    background: "#fafaf7",
    borderRadius: "0.5rem",
    padding: "1.5rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    color: "#0a0a0a",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };
  const title: React.CSSProperties = {
    fontSize: "22px",
    margin: 0,
    marginBottom: "0.75rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  };
  const body: React.CSSProperties = {
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#4a4a48",
    margin: 0,
    marginBottom: "1.25rem",
  };
  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "12px",
    color: "#4a4a48",
    marginBottom: "1.25rem",
  };
  const buttonRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  };
  const laterBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: busy ? "default" : "pointer",
    color: "#4a4a48",
    padding: "0.375rem 0.75rem",
    fontSize: "13px",
    borderRadius: "0.375rem",
    opacity: busy ? 0.6 : 1,
  };
  const importBtn: React.CSSProperties = {
    background: "#0a0a0a",
    color: "white",
    border: "none",
    cursor: busy ? "default" : "pointer",
    padding: "0.375rem 1rem",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "0.375rem",
    opacity: busy ? 0.6 : 1,
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importer les CV locaux"
      style={overlay}
    >
      <div style={card}>
        <h2 style={title}>Importer vos CV locaux ?</h2>
        <p style={body}>
          Vous avez {pending.length} CV{" "}
          {pending.length > 1 ? "enregistrés" : "enregistré"} sur cet appareil.
          Voulez-vous {pending.length > 1 ? "les importer" : "l'importer"} dans
          votre compte&nbsp;?
        </p>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={neverAsk}
            onChange={(e) => setNeverAsk(e.target.checked)}
            aria-label="Ne plus me demander"
          />
          Ne plus me demander
        </label>

        <div style={buttonRow}>
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            style={laterBtn}
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            style={importBtn}
          >
            {busy ? "Importation…" : "Importer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
