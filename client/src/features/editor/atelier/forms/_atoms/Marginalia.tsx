import type { ReactNode } from "react";

export function Marginalia({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "error" }) {
  return (
    <span
      role={kind === "error" ? "alert" : undefined}
      className={`block italic text-[12px] ${
        kind === "error" ? "text-[var(--atelier-accent)]" : "text-[var(--atelier-muted)]"
      }`}
      style={{ fontStyle: "italic", fontFamily: "var(--atelier-display)" }}
    >
      {children}
    </span>
  );
}
