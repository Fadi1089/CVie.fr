import type { CvData } from "../types/cv";
import { cvToJsonResume } from "./jsonResume/mapper";
import { requireTheme } from "./themes/index";
import type { AtsMode } from "./themes/types";
import type { SupportedLocale } from "./jsonResume/dates";

export type RenderResumeOptions = {
  themeId: string;
  atsMode: AtsMode;
  customization: Readonly<Record<string, unknown>>;
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
  return theme.render(resume, {
    atsMode: opts.atsMode,
    customization: parsed.data as Readonly<Record<string, unknown>>,
    locale,
  });
}
