import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { CvData, Palette, FontFamily } from "@cvie/shared";
import type { ThemeMeta } from "@cvie/shared";
import { cn } from "@/lib/utils";

type Channel = keyof Palette;

const CHANNELS: ReadonlyArray<{ key: Channel; label: string; hint: string }> = [
  { key: "accent", label: "Accent",      hint: "Barres, traits décoratifs, mots-clés" },
  { key: "link",   label: "Liens",       hint: "URLs, profils sociaux" },
  { key: "ink",    label: "Encre",       hint: "Titres, dates, texte d'en-tête" },
  { key: "soft",   label: "Encre douce", hint: "Corps de texte, métadonnées" },
  { key: "rule",   label: "Filets",      hint: "Séparateurs, bordures" },
  { key: "canvas", label: "Toile",       hint: "Fond de page" },
];

type TextRole = "name" | "label" | "section" | "title" | "card" | "body" | "meta" | "fine";

type SizeControl =
  | { kind: "text"; role: TextRole; label: string; hint: string; min: number; max: number; step: number; unit: "pt" }
  | { kind: "media"; label: string; hint: string; min: number; max: number; step: number; unit: "mm" }
  | { kind: "qr";    label: string; hint: string; min: number; max: number; step: number; unit: "mm" };

const SIZE_CONTROLS: ReadonlyArray<SizeControl> = [
  { kind: "text", role: "name",    label: "Nom",         hint: "Le nom en haut du CV (h1)",                   min: -5, max: 8, step: 0.25, unit: "pt" },
  { kind: "text", role: "label",   label: "Sous-titre",  hint: "Ligne sous le nom (intitulé de poste)",       min: -4, max: 6, step: 0.25, unit: "pt" },
  { kind: "text", role: "section", label: "Sections",    hint: 'En-têtes de section (EXPÉRIENCE, FORMATION)', min: -3, max: 5, step: 0.25, unit: "pt" },
  { kind: "text", role: "title",   label: "Postes",      hint: "Intitulés de postes et de diplômes",          min: -3, max: 5, step: 0.25, unit: "pt" },
  { kind: "text", role: "card",    label: "Cartes",      hint: "Compétences, langues, intérêts",              min: -3, max: 5, step: 0.25, unit: "pt" },
  { kind: "text", role: "body",    label: "Corps",       hint: "Paragraphes, listes, résumés",                min: -2, max: 4, step: 0.25, unit: "pt" },
  { kind: "text", role: "meta",    label: "Métadonnées", hint: "Dates, localités, mots-clés",                 min: -2, max: 4, step: 0.25, unit: "pt" },
  { kind: "media",                 label: "Photo",       hint: "Taille du portrait",                          min: -8, max: 12, step: 0.25, unit: "mm" },
  { kind: "qr",                    label: "QR",          hint: "Taille du code QR du portfolio",              min: -8, max: 12, step: 0.25, unit: "mm" },
];

type SpaceRole = "pageMargin" | "sectionGap" | "itemGap";

type SpacingControl = {
  role: SpaceRole;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: "mm" | "";
};

const SPACING_CONTROLS: ReadonlyArray<SpacingControl> = [
  { role: "pageMargin", label: "Marge de page", hint: "Espace autour du contenu", min: -6, max: 8, step: 0.25, unit: "mm" },
  { role: "sectionGap", label: "Espacement des sections", hint: "Entre les blocs principaux", min: -3, max: 8, step: 0.25, unit: "mm" },
  { role: "itemGap", label: "Espacement des éléments", hint: "Entre les entrées d'une section", min: -2, max: 6, step: 0.25, unit: "mm" },
];

type LineHeightRole = "tight" | "snug" | "base";

const LINE_HEIGHT_CONTROLS: ReadonlyArray<{
  role: LineHeightRole;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}> = [
  { role: "tight", label: "Titres",     hint: "Densité verticale des titres (h1)",                       min: -0.2, max: 0.4, step: 0.02 },
  { role: "snug",  label: "Interligne", hint: "Sections, cartes, dates, paragraphes, listes, résumés",   min: -0.2, max: 0.4, step: 0.02 },
];

const FONT_FAMILY_OPTIONS: ReadonlyArray<{ value: FontFamily; label: string }> = [
  { value: "helvetica-neue", label: "Helvetica Neue (par défaut)" },
  { value: "inter",          label: "Inter" },
  { value: "georgia",        label: "Georgia (serif)" },
  { value: "ibm-plex-sans",  label: "IBM Plex Sans" },
];

const LETTER_SPACING_MIN = -0.02;
const LETTER_SPACING_MAX = 0.04;
const LETTER_SPACING_STEP = 0.005;

export function DesignPanel({ theme }: { theme: ThemeMeta }) {
  const { control, setValue } = useFormContext<CvData>();
  const defaultPalette = theme.defaultPalette;
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

  const textSizes = useWatch({ control, name: "appearance.textSizes" });
  const mediaSize = useWatch({ control, name: "appearance.mediaSize" });
  const qrSize = useWatch({ control, name: "appearance.qrSize" });

  const TEXT_ROLES: readonly TextRole[] = [
    "name", "label", "section", "title", "card", "body", "meta", "fine",
  ];

  const updateTextSize = useCallback(
    (role: TextRole, value: number) => {
      const next: Partial<Record<TextRole, number>> = { ...(textSizes ?? {}), [role]: value };
      if (next[role] === 0) delete next[role];
      const isEmpty = TEXT_ROLES.every((r) => next[r] === undefined);
      setValue("appearance.textSizes", isEmpty ? undefined : next, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [textSizes, setValue],
  );

  const updateMediaSize = useCallback(
    (value: number) => {
      setValue("appearance.mediaSize", value === 0 ? undefined : value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue],
  );

  const updateQrSize = useCallback(
    (value: number) => {
      setValue("appearance.qrSize", value === 0 ? undefined : value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue],
  );

  const resetSizes = useCallback(() => {
    setValue("appearance.textSizes", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("appearance.mediaSize", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("appearance.qrSize", undefined, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const sizesAreCustom =
    (textSizes && TEXT_ROLES.some((r) => textSizes[r] !== undefined)) ||
    typeof mediaSize === "number" ||
    typeof qrSize === "number";

  const spacing = useWatch({ control, name: "appearance.spacing" });

  const updateSpacing = useCallback(
    (role: SpaceRole, value: number) => {
      const next = { ...(spacing ?? {}), [role]: value };
      if (next[role] === 0) delete next[role];
      const isEmpty =
        next.pageMargin === undefined &&
        next.sectionGap === undefined &&
        next.itemGap === undefined;
      setValue("appearance.spacing", isEmpty ? undefined : next, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [spacing, setValue],
  );

  const resetSpacing = useCallback(() => {
    setValue("appearance.spacing", undefined, {
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [setValue]);

  const spacingIsCustom =
    spacing !== undefined &&
    (spacing.pageMargin !== undefined ||
      spacing.sectionGap !== undefined ||
      spacing.itemGap !== undefined);

  const lineHeights = useWatch({ control, name: "appearance.lineHeights" });

  const updateLineHeight = useCallback(
    (role: LineHeightRole, value: number) => {
      const next: Partial<Record<LineHeightRole, number>> = { ...(lineHeights ?? {}), [role]: value };
      if (next[role] === 0) delete next[role];
      const isEmpty = next.tight === undefined && next.snug === undefined && next.base === undefined;
      setValue("appearance.lineHeights", isEmpty ? undefined : next, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [lineHeights, setValue],
  );

  const resetLineHeights = useCallback(() => {
    setValue("appearance.lineHeights", undefined, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const lineHeightsAreCustom =
    lineHeights !== undefined &&
    (lineHeights.tight !== undefined || lineHeights.snug !== undefined || lineHeights.base !== undefined);

  const typography = useWatch({ control, name: "appearance.typography" });

  const updateFontFamily = useCallback(
    (value: FontFamily | "") => {
      if (value === "") {
        const next = { ...(typography ?? {}) };
        delete (next as { fontFamily?: FontFamily }).fontFamily;
        const isEmpty = next.letterSpacing === undefined;
        setValue("appearance.typography", isEmpty ? undefined : next, {
          shouldDirty: true, shouldTouch: true,
        });
        return;
      }
      setValue(
        "appearance.typography",
        { ...(typography ?? {}), fontFamily: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [typography, setValue],
  );

  const updateLetterSpacing = useCallback(
    (value: number) => {
      const next = { ...(typography ?? {}), letterSpacing: value };
      if (value === 0) delete (next as { letterSpacing?: number }).letterSpacing;
      const isEmpty = next.fontFamily === undefined && next.letterSpacing === undefined;
      setValue("appearance.typography", isEmpty ? undefined : next, {
        shouldDirty: true, shouldTouch: true,
      });
    },
    [typography, setValue],
  );

  const resetTypography = useCallback(() => {
    setValue("appearance.typography", undefined, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const typographyIsCustom =
    typography !== undefined &&
    (typography.fontFamily !== undefined || typography.letterSpacing !== undefined);

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
          {theme.name}
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Personnalisez les six teintes de la palette. Les modifications
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

      <header className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Tailles
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Échelle des éléments
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Δ par défaut
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Ajustez la taille de chaque famille typographique et celle des
        éléments visuels d'en-tête. Zéro correspond au modèle Figma d'origine.
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        {SIZE_CONTROLS.map((ctrl) => {
          const value =
            ctrl.kind === "text"
              ? (textSizes?.[ctrl.role] ?? 0)
              : ctrl.kind === "qr"
                ? (qrSize ?? 0)
                : (mediaSize ?? 0);
          const id =
            ctrl.kind === "text"
              ? `size-text-${ctrl.role}`
              : ctrl.kind === "qr"
                ? "size-qr"
                : "size-media";
          const formatted = `${value > 0 ? "+" : ""}${value} ${ctrl.unit}`;
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2.5">
              <label htmlFor={id} className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {ctrl.label}
                </span>
                <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
                  {ctrl.hint}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={value}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(next)) return;
                    if (ctrl.kind === "text") updateTextSize(ctrl.role, next);
                    else if (ctrl.kind === "qr") updateQrSize(next);
                    else updateMediaSize(next);
                  }}
                  aria-label={`Taille — ${ctrl.label}`}
                  aria-valuemin={ctrl.min}
                  aria-valuemax={ctrl.max}
                  aria-valuenow={value}
                  className={cn(
                    "h-1 w-32 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)]",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-ink)]",
                    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-ink)]/30",
                  )}
                />
                <span className="font-mono-caps inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] tabular-nums text-[var(--color-ink)]">
                  {formatted}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            sizesAreCustom ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
          )}
        >
          {sizesAreCustom ? "Tailles personnalisées" : "Tailles d'origine"}
        </p>
        <button
          type="button"
          onClick={resetSizes}
          disabled={!sizesAreCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser tailles
        </button>
      </div>

      <header className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Typographie
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Police et lettrage
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          {typographyIsCustom ? "personnalisée" : "d'origine"}
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Choisissez la police du document et ajustez l'espacement des lettres du
        corps. Le nom en en-tête garde toujours un lettrage à zéro.
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        <li className="flex items-center gap-3 px-3 py-2.5">
          <label htmlFor="typo-font-family" className="flex flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--color-ink)]">
              Police
            </span>
            <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
              Famille de caractères pour tout le document
            </span>
          </label>
          <select
            id="typo-font-family"
            value={typography?.fontFamily ?? ""}
            onChange={(e) => updateFontFamily(e.target.value as FontFamily | "")}
            className="font-mono-caps h-8 rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30"
          >
            <option value="">— par défaut —</option>
            {FONT_FAMILY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </li>

        <li className="flex items-center gap-3 px-3 py-2.5">
          <label htmlFor="typo-letter-spacing" className="flex flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--color-ink)]">
              Espacement des lettres
            </span>
            <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
              Resserrage ou ouverture du corps de texte
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="typo-letter-spacing"
              type="range"
              min={LETTER_SPACING_MIN}
              max={LETTER_SPACING_MAX}
              step={LETTER_SPACING_STEP}
              value={typography?.letterSpacing ?? 0}
              onChange={(e) => {
                const next = Number.parseFloat(e.target.value);
                if (!Number.isFinite(next)) return;
                updateLetterSpacing(next);
              }}
              aria-label="Espacement des lettres"
              aria-valuemin={LETTER_SPACING_MIN}
              aria-valuemax={LETTER_SPACING_MAX}
              aria-valuenow={typography?.letterSpacing ?? 0}
              className={cn(
                "h-1 w-32 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)]",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow",
                "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-ink)]",
                "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-ink)]/30",
              )}
            />
            <span className="font-mono-caps inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] tabular-nums text-[var(--color-ink)]">
              {`${(typography?.letterSpacing ?? 0) > 0 ? "+" : ""}${(typography?.letterSpacing ?? 0).toFixed(3)} em`}
            </span>
          </div>
        </li>
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            typographyIsCustom ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
          )}
        >
          {typographyIsCustom ? "Typographie personnalisée" : "Typographie d'origine"}
        </p>
        <button
          type="button"
          onClick={resetTypography}
          disabled={!typographyIsCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser typographie
        </button>
      </div>

      <header className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Espacements
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Aération du contenu
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Δ par défaut
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Ajustez les marges, l'espacement des sections et l'interligne. Zéro
        correspond au modèle Figma d'origine.
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        {SPACING_CONTROLS.map((ctrl) => {
          const value = spacing?.[ctrl.role] ?? 0;
          const id = `space-${ctrl.role}`;
          const formatted =
            ctrl.unit === "mm"
              ? `${value > 0 ? "+" : ""}${value} mm`
              : `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2.5">
              <label htmlFor={id} className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {ctrl.label}
                </span>
                <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
                  {ctrl.hint}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={value}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(next)) return;
                    updateSpacing(ctrl.role, next);
                  }}
                  aria-label={`Espacement — ${ctrl.label}`}
                  aria-valuemin={ctrl.min}
                  aria-valuemax={ctrl.max}
                  aria-valuenow={value}
                  className={cn(
                    "h-1 w-32 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)]",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-ink)]",
                    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-ink)]/30",
                  )}
                />
                <span className="font-mono-caps inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] tabular-nums text-[var(--color-ink)]">
                  {formatted}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            spacingIsCustom ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
          )}
        >
          {spacingIsCustom ? "Espacements personnalisés" : "Espacements d'origine"}
        </p>
        <button
          type="button"
          onClick={resetSpacing}
          disabled={!spacingIsCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser espacements
        </button>
      </div>

      <header className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Interlignes
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Densité des lignes
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Δ par défaut
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Ajustez l'interligne par rôle. Zéro correspond aux interlignes par défaut
        du thème (titres 1.15, interligne 1.3).
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        {LINE_HEIGHT_CONTROLS.map((ctrl) => {
          const value = lineHeights?.[ctrl.role] ?? 0;
          const id = `lh-${ctrl.role}`;
          const formatted = `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2.5">
              <label htmlFor={id} className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {ctrl.label}
                </span>
                <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
                  {ctrl.hint}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={value}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(next)) return;
                    updateLineHeight(ctrl.role, next);
                  }}
                  aria-label={`Interligne — ${ctrl.label}`}
                  aria-valuemin={ctrl.min}
                  aria-valuemax={ctrl.max}
                  aria-valuenow={value}
                  className={cn(
                    "h-1 w-32 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)]",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-ink)]",
                    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-ink)]/30",
                  )}
                />
                <span className="font-mono-caps inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] tabular-nums text-[var(--color-ink)]">
                  {formatted}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            lineHeightsAreCustom ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
          )}
        >
          {lineHeightsAreCustom ? "Interlignes personnalisés" : "Interlignes d'origine"}
        </p>
        <button
          type="button"
          onClick={resetLineHeights}
          disabled={!lineHeightsAreCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser interlignes
        </button>
      </div>
    </div>
  );
}
