import type { LabelHTMLAttributes, ReactNode } from "react";

export function SmallCapsLabel({
  children,
  htmlFor,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10.5px] tracking-[0.18em] text-[var(--atelier-muted)]"
      style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-body)" }}
      {...rest}
    >
      {children}
    </label>
  );
}
