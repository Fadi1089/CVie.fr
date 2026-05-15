// shared/src/templates/themes/types.ts
import type { z } from "zod";
import type { JsonResume } from "../jsonResume/schema";
import type { SupportedLocale } from "../jsonResume/dates";

/** Three export profiles, ordered most-restrictive to least. */
export type AtsMode = "ats-strict" | "ats-balanced" | "expressive";

/** Tier gating — checked server-side before rendering. */
export type ThemeTier = "free" | "premium";

/** ATS profile declared by a theme: the strictest mode it can support without
 *  visual collapse. A theme whose narrowest mode is "ats-balanced" cannot be
 *  rendered in "ats-strict" — the renderer falls back to a system theme. */
export type AtsProfile = {
  readonly minSupported: AtsMode;
  readonly defaultMode: AtsMode;
};

export type ThemeMeta = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tier: ThemeTier;
  readonly atsProfile: AtsProfile;
  /** Whether this theme renders the basics.image. ATS-strict ignores it. */
  readonly supportsPhoto: boolean;
  /** Default customization values — also the reset target in the UI. */
  readonly defaultCustomization: Readonly<Record<string, unknown>>;
  /** Zod schema validating the theme's customization. Public so the UI can
   *  introspect knob ranges/choices. */
  readonly customizationSchema: z.ZodTypeAny;
};

export type ThemeCustomization<Shape extends Record<string, unknown>> = Shape;

export type ThemeRenderOptions = {
  readonly atsMode: AtsMode;
  readonly customization: Readonly<Record<string, unknown>>;
  readonly locale: SupportedLocale;
};

export type Theme = {
  readonly meta: ThemeMeta;
  /** Pure function: JSON Resume → complete HTML document. Must NOT throw on
   *  any input that passes jsonResumeSchema — emit a best-effort document. */
  readonly render: (resume: JsonResume, options: ThemeRenderOptions) => string;
};
