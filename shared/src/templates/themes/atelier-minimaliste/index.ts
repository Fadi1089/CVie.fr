import type { Theme } from "../types";
import { render } from "./render";
import { customizationSchema, defaultCustomization } from "./customization";

export const atelierMinimaliste: Theme = {
  meta: {
    id: "atelier-minimaliste",
    name: "Atelier — Minimaliste",
    description: "Grille suisse : IBM Plex Sans, dates monospace, sans photo, ATS-strict natif.",
    tier: "free",
    atsProfile: { minSupported: "ats-strict", defaultMode: "ats-strict" },
    supportsPhoto: false,
    defaultPalette: {
      accent: "#111111",
      link:   "#0095ff",
      ink:    "#111111",
      soft:   "#333333",
      rule:   "#111111",
      canvas: "#ECECEC",
    },
    defaultCustomization,
    customizationSchema,
  },
  render,
};
