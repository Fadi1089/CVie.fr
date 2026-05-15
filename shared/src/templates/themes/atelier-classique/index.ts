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
    defaultCustomization,
    customizationSchema,
  },
  render,
};
