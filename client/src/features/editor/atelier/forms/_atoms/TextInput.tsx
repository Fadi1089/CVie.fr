import { useId } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  label: string;
  placeholder?: string;
  error?: string;
};

export function TextInput({ value, onChange, onBlur, label, placeholder, error }: Props) {
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_minmax(0,18ch)] gap-x-6 gap-y-1 py-2 items-baseline">
      <div>
        <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.currentTarget.value)}
          onBlur={onBlur}
          className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5 text-[var(--atelier-ink)] focus:border-[var(--atelier-accent)] transition-colors"
          style={{ fontFamily: "var(--atelier-body)" }}
        />
      </div>
      {error ? (
        <span className="italic text-[12px] text-[var(--atelier-accent)] self-end" style={{ fontFamily: "var(--atelier-display)" }}>
          {error}
        </span>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}
