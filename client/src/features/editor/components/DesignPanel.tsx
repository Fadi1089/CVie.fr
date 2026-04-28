import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { templateRegistry, type CvData, type Palette, type TemplateId } from "@cvie/shared";
import { cn } from "@/lib/utils";

type Channel = keyof Palette;

const CHANNELS: ReadonlyArray<{ key: Channel; label: string; hint: string }> = [
  { key: "accent", label: "Accent", hint: "Liens, barres, traits décoratifs" },
  { key: "ink", label: "Encre", hint: "Texte principal, titres" },
  { key: "soft", label: "Encre douce", hint: "Métadonnées, dates, légendes" },
  { key: "rule", label: "Filets", hint: "Séparateurs, bordures" },
  { key: "canvas", label: "Toile", hint: "Fond hors-page" },
];

export function DesignPanel({ templateId }: { templateId: TemplateId }) {
  const { control, setValue } = useFormContext<CvData>();
  const meta = templateRegistry.find((t) => t.id === templateId) ?? templateRegistry[0]!;
  const defaultPalette = meta.defaultPalette;
  const override = useWatch({ control, name: "appearance.palette" });
  const effective: Palette = { ...defaultPalette, ...(override ?? {}) };
  const isCustom = override !== undefined;

  const updateChannel = useCallback(
    (channel: Channel, value: string) => {
      // Validate hex format defensively — color input always emits #rrggbb,
      // but the manual text input could send mid-typing strings. The schema
      // would reject those at submit; here we just don't propagate them.
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
      setValue(
        "appearance.palette",
        { ...effective, [channel]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [effective, setValue],
  );

  const resetToDefault = useCallback(() => {
    setValue("appearance.palette", undefined, {
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [setValue]);

  return (
    <div
      role="tabpanel"
      id="editor-section-design"
      aria-labelledby="editor-tab-design"
      className="flex w-full flex-col gap-4"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Palette
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Couleurs du modèle
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          {meta.name}
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Personnalisez les cinq teintes de la palette. Les modifications
        s'appliquent en direct à l'aperçu et au PDF exporté.
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        {CHANNELS.map((channel) => {
          const value = effective[channel.key];
          const isOverridden = override?.[channel.key] !== undefined;
          return (
            <li
              key={channel.key}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <label
                htmlFor={`palette-${channel.key}`}
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {channel.label}
                </span>
                <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
                  {channel.hint}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`palette-${channel.key}`}
                  type="color"
                  value={value}
                  onChange={(e) => updateChannel(channel.key, e.target.value)}
                  aria-label={`Couleur ${channel.label}`}
                  className={cn(
                    "relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[var(--color-ink)]/25 bg-white p-0 shadow-[inset_0_0_0_2px_#fff]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30",
                    "[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-[3px] [&::-moz-color-swatch]:border-0",
                  )}
                />
                <input
                  type="text"
                  value={value.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value.startsWith("#")
                      ? e.target.value
                      : `#${e.target.value}`;
                    updateChannel(channel.key, v);
                  }}
                  aria-label={`Code hex ${channel.label}`}
                  spellCheck={false}
                  maxLength={7}
                  className={cn(
                    "font-mono-caps h-8 w-[5.5rem] rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] uppercase tabular-nums text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30",
                    isOverridden && "border-[var(--color-ink)]/40",
                  )}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            isCustom
              ? "text-[var(--color-ink)]"
              : "text-[var(--color-ink-soft)]",
          )}
        >
          {isCustom ? "Palette personnalisée" : "Palette d'origine"}
        </p>
        <button
          type="button"
          onClick={resetToDefault}
          disabled={!isCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser palette
        </button>
      </div>
    </div>
  );
}
