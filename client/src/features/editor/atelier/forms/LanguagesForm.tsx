import { useId } from "react";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { SmallCapsLabel } from "./_atoms/SmallCapsLabel";

const LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "natif"] as const;

function LangLevelSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
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
        {LANG_LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LanguagesForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "languages" });

  return (
    <div className="grid gap-6">
      {fields.map((field, i) => (
        <article key={field.id} className="border-t border-[var(--atelier-rule)]/20 pt-4">
          <header className="flex items-center justify-between mb-2">
            <span
              className="text-[14px] text-[var(--atelier-accent)] tabular-nums"
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              #{(i + 1).toString().padStart(2, "0")}
            </span>
            <div className="flex gap-2 text-[10px] tracking-[0.18em] text-[var(--atelier-muted)]">
              {i > 0 && (
                <button type="button" onClick={() => swap(i, i - 1)} aria-label="Déplacer ↑">
                  ↑
                </button>
              )}
              {i < fields.length - 1 && (
                <button type="button" onClick={() => swap(i, i + 1)} aria-label="Déplacer ↓">
                  ↓
                </button>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Supprimer">
                ×
              </button>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-x-6">
            <Controller
              control={control}
              name={`languages.${i}.name`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Langue" />
              )}
            />
            <Controller
              control={control}
              name={`languages.${i}.level`}
              render={({ field: f }) => (
                <LangLevelSelect
                  value={f.value ?? "B1"}
                  onChange={f.onChange}
                  label="Niveau"
                />
              )}
            />
          </div>
        </article>
      ))}
      <button
        type="button"
        onClick={() => append({ id: crypto.randomUUID(), name: "", level: "B1" })}
        className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        + Ajouter une langue
      </button>
    </div>
  );
}
