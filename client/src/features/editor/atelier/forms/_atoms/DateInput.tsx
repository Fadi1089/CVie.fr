import { useId, useState, useEffect } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = { value: string; onChange: (v: string) => void; label: string };

const ISO = /^\d{4}-\d{2}$/;
const FRENCH = /^(\d{2})\/(\d{4})$/;

function toDisplay(v: string): string {
  if (v === "present") return "présent";
  if (ISO.test(v)) {
    const [y, m] = v.split("-");
    return `${m}/${y}`;
  }
  return v;
}

function fromDisplay(v: string): string {
  const t = v.trim().toLowerCase();
  if (t === "") return "";
  if (t === "présent" || t === "present" || t === "en cours") return "present";
  const m = FRENCH.exec(t);
  if (m) return `${m[2]}-${m[1]}`;
  if (ISO.test(t)) return t;
  return v;
}

export function DateInput({ value, onChange, label }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(() => toDisplay(value));

  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  return (
    <div className="py-2">
      <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder="MM/AAAA"
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => onChange(fromDisplay(draft))}
        aria-label={label}
        className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5"
        style={{ fontFamily: "var(--atelier-mono)" }}
      />
    </div>
  );
}
