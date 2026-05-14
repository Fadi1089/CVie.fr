import { z } from "zod";
import type { Theme } from "../types";
import { render } from "./render";

/** Five curated accents. Names map to oxblood, indigo, vert-sapin, etc. — the
 *  rendered colour is determined inside styles.ts. Free-form hex is NOT
 *  exposed; this is the "controlled customization" the redesign requires. */
const accentSchema = z.enum([
  "oxblood",
  "encre",
  "sapin",
  "graphite",
  "marine",
]);

const customizationSchema = z.object({
  accent: accentSchema,
  density: z.enum(["compact", "comfy"]),
  photoShape: z.enum(["square", "rounded", "circle"]),
});

const defaultCustomization: z.infer<typeof customizationSchema> = {
  accent: "oxblood",
  density: "comfy",
  photoShape: "rounded",
};

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
