import { z } from "zod";

const accentSchema = z.enum([
  "oxblood",
  "encre",
  "sapin",
  "graphite",
  "marine",
]);

export const customizationSchema = z.object({
  accent: accentSchema,
  density: z.enum(["compact", "comfy"]),
  photoShape: z.enum(["square", "rounded", "circle"]),
});

export type Customization = z.infer<typeof customizationSchema>;

export const defaultCustomization: Customization = {
  accent: "oxblood",
  density: "comfy",
  photoShape: "rounded",
};
