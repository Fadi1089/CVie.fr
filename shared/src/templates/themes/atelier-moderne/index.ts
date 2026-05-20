import type { Theme } from "../types";
import { render } from "./render";
import { customizationSchema, defaultCustomization } from "./customization";

export const atelierModerne: Theme = {
  meta: {
    id: "atelier-moderne",
    name: "Atelier — Moderne",
    description:
      "Éditorial presse : serif Newsreader, mise en page asymétrique deux colonnes, accent rouille.",
    tier: "premium",
    atsProfile: { minSupported: "ats-balanced", defaultMode: "ats-balanced" },
    supportsPhoto: true,
    defaultPalette: {
      accent: "#A8421E",
      link:   "#0095ff",
      ink:    "#111111",
      soft:   "#3A3A3A",
      rule:   "#A8421E",
      canvas: "#E9E6E0",
    },
    defaultCustomization,
    customizationSchema,
  },
  render,
};
