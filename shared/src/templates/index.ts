export * from "./renderer";
export * from "./registry";
export { classiqueCss } from "./styles/classique";
export { moderneCss } from "./styles/moderne";
export { minimalisteCss } from "./styles/minimaliste";
export { renderResumeHtml } from "./resumeRenderer";
export type { RenderResumeOptions } from "./resumeRenderer";
export {
  buildAppearanceVarsCss,
  injectAppearanceVars,
} from "./themes/_shared/appearanceVars";
export {
  APPEARANCE_RUNTIME_SCRIPT,
  injectAppearanceRuntime,
} from "./themes/_shared/appearanceRuntime";
export {
  themeRegistry,
  getTheme,
  requireTheme,
  listThemes,
} from "./themes/index";
export type {
  Theme,
  ThemeMeta,
  ThemeRenderOptions,
  AtsMode,
  ThemeTier,
  AtsProfile,
} from "./themes/types";
export { cvToJsonResume } from "./jsonResume/mapper";
export { jsonResumeSchema } from "./jsonResume/schema";
export type { JsonResume } from "./jsonResume/schema";
export { validateAtsHtml } from "./ats/validator";
export type { AtsReport } from "./ats/validator";
// Re-export the CV fixture and the JSON Resume fixture from the top-level
// barrel so every consumer (tests + scripts) uses `@cvie/shared` (no deep
// imports).
export { sampleCv as sampleCvFixture } from "./__fixtures__/sampleCv";
export { sampleResume } from "./__fixtures__/sampleResume";
