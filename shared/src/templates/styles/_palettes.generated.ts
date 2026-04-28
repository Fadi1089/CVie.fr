/**
 * @generated from Figma template colors via `bun run sync:figma-templates`.
 * Do not edit by hand. Maps each template's Figma `colors` object onto the
 * 5-channel palette consumed by the Design tab and renderer overrides.
 *
 * Channel mapping:
 *   accent → colors.accent
 *   ink    → colors.text
 *   soft   → colors.muted
 *   rule   → colors.rule
 *   canvas → colors.canvasBackground
 */

import type { Palette } from "../../types/cv";

export const defaultPalettes = {
  classique: {
    accent: "#1B365D",
    ink: "#141413",
    soft: "#5E5D59",
    rule: "#D4D2CC",
    canvas: "#E6E4D8",
  },
  moderne: {
    accent: "#A8421E",
    ink: "#111111",
    soft: "#3A3A3A",
    rule: "#A8421E",
    canvas: "#E9E6E0",
  },
  minimaliste: {
    accent: "#111111",
    ink: "#111111",
    soft: "#555555",
    rule: "#111111",
    canvas: "#ECECEC",
  },
} as const satisfies Record<"classique" | "moderne" | "minimaliste", Palette>;
