import type { Palette } from "../types/cv";
import { defaultPalettes } from "./styles/_palettes.generated";
import type { TemplateId } from "./renderer";

/**
 * Metadata for a CV template — everything the browser UI needs to display and
 * select a template, without pulling in the CSS string.
 *
 * `atsCompatible` is a literal `true` for every MVP template because we've
 * verified text-extraction fidelity through the PDF pipeline (see Story 1.3).
 * If a future template fails ATS validation it must not ship through this
 * registry — it should stay behind a feature flag or be removed.
 *
 * `defaultPalette` is the canonical 5-color palette baked into each template's
 * CSS. The Design tab exposes per-color overrides; the "Réinitialiser" button
 * restores these defaults. Synced from Figma fills via templateSync.
 */
export type TemplateMeta = {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  readonly atsCompatible: true;
  readonly defaultPalette: Palette;
};

export const templateRegistry: readonly TemplateMeta[] = [
  {
    id: "classique",
    name: "Classique",
    description:
      "Structure française traditionnelle, en-tête sobre et lisible.",
    atsCompatible: true,
    defaultPalette: defaultPalettes.classique,
  },
  {
    id: "moderne",
    name: "Moderne",
    description:
      "Éditorial presse : serif italique, accent rouille, mise en page asymétrique.",
    atsCompatible: true,
    defaultPalette: defaultPalettes.moderne,
  },
  {
    id: "minimaliste",
    name: "Minimaliste",
    description:
      "Ligne claire suisse : noir et blanc, dates monospace, grille typographique, sans photo.",
    atsCompatible: true,
    defaultPalette: defaultPalettes.minimaliste,
  },
] as const;
