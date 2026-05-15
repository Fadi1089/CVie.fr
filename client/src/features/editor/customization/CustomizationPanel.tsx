import type { ThemeMeta } from "@cvie/shared";
import { introspectCustomizationSchema } from "./introspect";

type Props = {
  theme: ThemeMeta;
  value: Readonly<Record<string, unknown>>;
  onChange: (next: Record<string, unknown>) => void;
};

const LABEL_MAP: Record<string, string> = {
  accent: "Accent",
  density: "Densité",
  photoShape: "Photo",
};

export function CustomizationPanel({ theme, value, onChange }: Props) {
  const controls = introspectCustomizationSchema(theme.customizationSchema);

  return (
    <section
      aria-label="Personnalisation du thème"
      className="px-6 py-5 border-t border-[var(--atelier-rule)]/30 flex flex-col gap-4"
    >
      <p
        className="tracking-[0.18em] uppercase text-[10px] text-[var(--atelier-muted)]"
        style={{ fontVariant: "small-caps" }}
      >
        Personnaliser — {theme.name}
      </p>
      {controls.map((c) => {
        if (c.kind === "unknown") return null;
        const label = LABEL_MAP[c.key] ?? c.key;
        return (
          <div
            key={c.key}
            role="radiogroup"
            aria-label={label}
            className="flex flex-wrap items-center gap-2"
          >
            <span
              className="text-[10px] uppercase tracking-[0.16em] text-[var(--atelier-muted)] w-20"
              style={{ fontVariant: "small-caps" }}
            >
              {label}
            </span>
            {c.choices.map((choice) => {
              const active = value[c.key] === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={choice}
                  onClick={() => onChange({ ...value, [c.key]: choice })}
                  className={`px-2.5 py-1 text-[11px] border transition-colors ${
                    active
                      ? "border-[var(--atelier-accent)] text-[var(--atelier-ink)]"
                      : "border-[var(--atelier-rule)]/30 text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
                  }`}
                  style={{ fontFamily: "var(--atelier-body)" }}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
