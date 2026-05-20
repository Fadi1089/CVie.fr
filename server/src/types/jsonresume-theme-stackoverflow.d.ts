declare module "jsonresume-theme-stackoverflow" {
  // The upstream package ships no .d.ts despite claiming `"types": "dist/index.d.ts"`.
  // Shape derived from dist/index.js:
  //   render2(resume, options) — options.language ?: string
  //   changeLanguage(lang)
  //   pdfRenderOptions
  // Keep the resume parameter as `unknown` so callers must serialise via
  // `cvToJsonResume` rather than passing CVie's internal shape.
  export function render(
    resume: unknown,
    options?: { language?: string },
  ): string;
  export function changeLanguage(lang: string): void;
  export const pdfRenderOptions: Readonly<Record<string, unknown>>;
}
