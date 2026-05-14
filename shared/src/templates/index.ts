export * from "./renderer";
export * from "./registry";
export { classiqueCss } from "./styles/classique";
export { moderneCss } from "./styles/moderne";
export { minimalisteCss } from "./styles/minimaliste";
export { renderResumeHtml } from "./resumeRenderer";
export type { RenderResumeOptions } from "./resumeRenderer";
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
// Re-export the CV fixture and the JSON Resume fixture from the top-level
// barrel so every consumer (tests + scripts) uses `@cvie/shared` (no deep
// imports). `validateAtsHtml` / `AtsReport` will be added in Task 8.2 once
// the validator module exists.
export { sampleCv as sampleCvFixture } from "./__fixtures__/sampleCv";
export { sampleResume } from "./__fixtures__/sampleResume";
