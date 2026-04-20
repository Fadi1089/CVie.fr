import type { TemplateId } from "./renderer";

/**
 * Metadata for a CV template — everything the browser UI needs to display and
 * select a template, without pulling in the CSS string.
 *
 * `atsCompatible` is a literal `true` for every MVP template because we've
 * verified text-extraction fidelity through the PDF pipeline (see Story 1.3).
 * If a future template fails ATS validation it must not ship through this
 * registry — it should stay behind a feature flag or be removed.
 */
export type TemplateMeta = {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  readonly atsCompatible: true;
};

export const templateRegistry: readonly TemplateMeta[] = [
  {
    id: "classique",
    name: "Classique",
    description:
      "Structure française traditionnelle, en-tête sobre et lisible.",
    atsCompatible: true,
  },
  {
    id: "moderne",
    name: "Moderne",
    description:
      "Titres sérifs et palette verte, ton professionnel contemporain.",
    atsCompatible: true,
  },
  {
    id: "minimaliste",
    name: "Minimaliste",
    description:
      "Noir et blanc, typographie capitalisée, sans photo.",
    atsCompatible: true,
  },
] as const;
