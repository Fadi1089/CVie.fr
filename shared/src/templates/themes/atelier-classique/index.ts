import type { Theme } from "../types";
import { render } from "./render";
import { customizationSchema, defaultCustomization } from "./customization";

export const atelierClassique: Theme = {
  meta: {
    id: "atelier-classique",
    name: "Atelier — Classique",
    description:
      "Structure éditoriale française : titres serif, dates monospace, numérotation de section, palette oxblood.",
    tier: "free",
    atsProfile: { minSupported: "ats-strict", defaultMode: "ats-balanced" },
    supportsPhoto: true,
    defaultPalette: {
      accent: "#1B365D",
      link:   "#0095ff",
      ink:    "#141413",
      soft:   "#5E5D59",
      rule:   "#D4D2CC",
      canvas: "#E6E4D8",
    },
    defaultCustomization,
    customizationSchema,
  },
  render,
};
