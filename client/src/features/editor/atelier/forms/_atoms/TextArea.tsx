import { useId } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  rows?: number;
  error?: string;
};

export function TextArea({ value, onChange, label, rows = 3, error }: Props) {
  const id = useId();
  return (
    <div className="py-2">
      <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5 text-[var(--atelier-ink)] focus:border-[var(--atelier-accent)] transition-colors resize-y"
        style={{ fontFamily: "var(--atelier-body)" }}
      />
      {error && (
        <p className="mt-1 italic text-[12px] text-[var(--atelier-accent)]" style={{ fontFamily: "var(--atelier-display)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
