import { z } from "zod";

export const customizationSchema = z.object({
  density: z.enum(["compact", "comfy"]),
});

export type Customization = z.infer<typeof customizationSchema>;

export const defaultCustomization: Customization = { density: "comfy" };
