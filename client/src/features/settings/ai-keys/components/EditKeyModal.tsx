import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { validateKey, type AiProvider } from "@cvie/shared";

const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google Gemini",
};

type Props = {
  provider: AiProvider;
  onSubmit: (key: string) => Promise<void>;
  onCancel: () => void;
};

export function EditKeyModal({ provider, onSubmit, onCancel }: Props) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (typeof document === "undefined") return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    const v = validateKey(provider, trimmed);
    if (!v.ok) {
      setError(v.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }
    setBusy(false);
  }

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
    marginBottom: "0.25rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  };
  const blurb: React.CSSProperties = {
    fontSize: "12px",
    color: "#6a6a68",
    margin: 0,
    marginBottom: "1rem",
    lineHeight: 1.5,
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    fontSize: "13px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    border: "1px solid #d8d6cf",
    borderRadius: "0.4rem",
    background: "#fff",
    boxSizing: "border-box",
  };
  const errorStyle: React.CSSProperties = {
    color: "#b33d3b",
    fontSize: "12px",
    marginTop: "0.4rem",
    minHeight: "1em",
  };
  const buttonRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
    marginTop: "1rem",
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
  const submitBtn: React.CSSProperties = {
    background: "#0a0a0a",
    color: "white",
    border: "none",
    cursor: busy ? "default" : "pointer",
    padding: "0.5rem 1rem",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "9999px",
    opacity: busy ? 0.6 : 1,
  };

  return createPortal(
    <div role="dialog" aria-modal="true" style={overlay} onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={title}>Clé {PROVIDER_LABEL[provider]}</h2>
        <p style={blurb}>
          Stockée chiffrée (AES-256-GCM). Jamais retournée en clair par le serveur.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            placeholder="Collez votre clé ici"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={busy}
            style={input}
            aria-label={`Clé API ${PROVIDER_LABEL[provider]}`}
            aria-invalid={error !== null}
          />
          <div role="alert" style={errorStyle}>
            {error ?? ""}
          </div>
          <div style={buttonRow}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={cancelBtn}
            >
              Annuler
            </button>
            <button type="submit" disabled={busy} style={submitBtn}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
