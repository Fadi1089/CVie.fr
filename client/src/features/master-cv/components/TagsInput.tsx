import { useState } from "react";

export function TagsInput({
  value,
  onChange,
  max = 20,
}: { value: string[]; onChange: (next: string[]) => void; max?: number }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().slice(0, 40);
    if (!t || value.includes(t) || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };
  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((t) => (
        <span key={t} className="rounded-full bg-[var(--color-ink)]/8 px-2 py-0.5 text-[11px]">
          {t}
          <button type="button" onClick={() => remove(t)} className="ml-1 text-[var(--color-ink-soft)]">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        className="min-w-[80px] flex-1 bg-transparent text-[11px] outline-none"
        placeholder="+ tag"
        maxLength={40}
      />
    </div>
  );
}
