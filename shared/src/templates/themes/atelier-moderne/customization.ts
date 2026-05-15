import { z } from "zod";

const accentSchema = z.enum(["rust", "sepia", "aubergine", "forest", "encre"]);

export const customizationSchema = z.object({
  accent: accentSchema,
  density: z.enum(["compact", "comfy"]),
  photoShape: z.enum(["square", "rounded"]),
});

export type Customization = z.infer<typeof customizationSchema>;

export const defaultCustomization: Customization = {
  accent: "rust",
  density: "comfy",
  photoShape: "rounded",
};
