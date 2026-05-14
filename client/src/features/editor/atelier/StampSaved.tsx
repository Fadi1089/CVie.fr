export function StampSaved() {
  return (
    <span
      data-testid="stamp-saved"
      aria-hidden="true"
      className="atelier-stamp inline-block w-3 h-3"
      style={{
        background: "var(--atelier-accent)",
        animation: "atelier-stamp-in 320ms cubic-bezier(.22,1,.36,1) both",
      }}
    />
  );
}
