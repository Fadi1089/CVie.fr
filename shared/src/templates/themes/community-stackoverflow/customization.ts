import { z } from "zod";

// The upstream `jsonresume-theme-stackoverflow` package has no user-facing
// knobs we expose. Keep the schema empty so DesignPanel renders nothing and
// the validation pipeline accepts `{}`.
export const customizationSchema = z.object({}).strict();

export type Customization = z.infer<typeof customizationSchema>;

export const defaultCustomization: Customization = {};
