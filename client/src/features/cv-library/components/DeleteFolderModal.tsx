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
    fontSize: "20px",
    margin: 0,
    marginBottom: "0.75rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  };
  const body: React.CSSProperties = {
    fontSize: "13px",
    color: "#4a4a48",
    margin: 0,
    marginBottom: "1rem",
  };
  const select: React.CSSProperties = {
    width: "100%",
    marginBottom: "1.25rem",
    padding: "0.5rem 0.75rem",
    border: "1px solid #e8e6df",
    borderRadius: "0.375rem",
    background: "white",
    fontSize: "13px",
  };
  const buttonRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  };
  const cancelBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: busy ? "default" : "pointer",
    color: "#4a4a48",
    padding: "0.375rem 0.75rem",
    fontSize: "13px",
    borderRadius: "0.375rem",
    opacity: busy ? 0.6 : 1,
  };
  const deleteBtn: React.CSSProperties = {
    background: "#dc2626",
    color: "white",
    border: "none",
    cursor: busy || !target ? "default" : "pointer",
    padding: "0.375rem 1rem",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "0.375rem",
    opacity: busy || !target ? 0.6 : 1,
  };

  return createPortal(
    <div role="dialog" aria-modal="true" style={overlay}>
      <div style={card}>
        <h2 style={title}>Supprimer "{folder.name}"&nbsp;?</h2>
        <p style={body}>
          Ce dossier contient {cvCount} CV. Choisissez où les déplacer&nbsp;:
        </p>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={select}
        >
          {reassignTargets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div style={buttonRow}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={cancelBtn}
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
            style={deleteBtn}
          >
            {busy ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
