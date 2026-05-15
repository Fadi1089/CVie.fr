import { useId } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
  placeholder?: string;
};

export function Select({ value, onChange, label, options, placeholder }: Props) {
  const id = useId();
  return (
    <div className="py-2">
      <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5 text-[var(--atelier-ink)] focus:border-[var(--atelier-accent)] transition-colors"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
