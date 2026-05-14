import type { Theme } from "../types";
import { render } from "./render";
import { customizationSchema, defaultCustomization } from "./customization";

export const atelierModerne: Theme = {
  meta: {
    id: "atelier-moderne",
    name: "Atelier — Moderne",
    description:
      "Éditorial presse : serif Newsreader, mise en page asymétrique deux colonnes, accent rouille.",
    tier: "free",
    atsProfile: { minSupported: "ats-balanced", defaultMode: "ats-balanced" },
    supportsPhoto: true,
    defaultCustomization,
    customizationSchema,
  },
  render,
};
