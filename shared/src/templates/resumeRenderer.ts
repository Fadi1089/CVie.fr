import type { CvData } from "../types/cv";
import { cvToJsonResume } from "./jsonResume/mapper";
import { requireTheme } from "./themes/index";
import type { AtsMode } from "./themes/types";
import type { SupportedLocale } from "./jsonResume/dates";
import { injectAppearanceVars } from "./themes/_shared/appearanceVars";
import { injectAppearanceRuntime } from "./themes/_shared/appearanceRuntime";

export type RenderResumeOptions = {
  themeId: string;
  atsMode: AtsMode;
  customization: Readonly<Record<string, unknown>>;
  /**
   * Optional density scale (0.5–2). The Design tab's appearance.* knobs are
   * read straight from `cv.appearance`; `scale` is the session-scoped slider
   * value the editor passes for live preview. Defaults to 1 if omitted.
   */
  scale?: number;
};

export function renderResumeHtml(cv: CvData, opts: RenderResumeOptions): string {
  const theme = requireTheme(opts.themeId);
  // Merge the partial customization the caller passed with the theme defaults.
  const customization = {
    ...theme.meta.defaultCustomization,
    ...opts.customization,
  };
  const parsed = theme.meta.customizationSchema.safeParse(customization);
  if (!parsed.success) {
    throw new Error(
      `Invalid customization for theme '${opts.themeId}': ${parsed.error.message}`,
    );
  }
  const resume = cvToJsonResume(cv);
  const locale: SupportedLocale = cv.appearance?.locale ?? "fr";
  const html = theme.render(resume, {
    atsMode: opts.atsMode,
    customization: parsed.data as Readonly<Record<string, unknown>>,
    locale,
  });
  const withVars = injectAppearanceVars(html, cv.appearance, opts.scale ?? 1);
  return injectAppearanceRuntime(withVars);
}
