import { useState } from "react";
import { createPortal } from "react-dom";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  cvCount: number;
  /** Confirm — caller is responsible for moving CVs into the trash and
   *  deleting the folder server-side. */
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export function DeleteFolderModal({
  folder,
  cvCount,
  onConfirm,
  onCancel,
}: Props) {
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
    maxWidth: "26rem",
    background: "#fafaf7",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    color: "#0a0a0a",
    fontFamily: "system-ui, -apple-system, sans-serif",
    border: "1px solid #e8e6df",
  };
  const title: React.CSSProperties = {
    fontSize: "18px",
    margin: 0,
    marginBottom: "0.5rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  };
  const body: React.CSSProperties = {
    fontSize: "13px",
    color: "#4a4a48",
    margin: 0,
    marginBottom: "1.25rem",
    lineHeight: 1.5,
  };
  const buttonRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
  };
  const cancelBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: busy ? "default" : "pointer",
    color: "#4a4a48",
    padding: "0.5rem 1rem",
    fontSize: "12px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    borderRadius: "9999px",
    opacity: busy ? 0.6 : 1,
  };
  const deleteBtn: React.CSSProperties = {
    background: "#b33d3b",
    color: "white",
    border: "none",
    cursor: busy ? "default" : "pointer",
    padding: "0.5rem 1rem",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "9999px",
    opacity: busy ? 0.6 : 1,
  };

  const detail =
    cvCount > 0
      ? `Les ${cvCount} CV de ce dossier seront déplacés dans la corbeille.`
      : "Ce dossier est vide.";

  return createPortal(
    <div role="dialog" aria-modal="true" style={overlay} onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={title}>Supprimer « {folder.name} » ?</h2>
        <p style={body}>{detail}</p>
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
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
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
