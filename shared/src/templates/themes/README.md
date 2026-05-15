# Authoring a theme

A theme is a vendored TypeScript module that turns a JSON Resume document into
a complete, print-ready HTML document.

## Contract

Each theme lives at `shared/src/templates/themes/<theme-id>/` and exports:

```ts
export const theme: Theme = {
  meta: { /* id, name, tier, atsProfile, customizationSchema, defaultCustomization, supportsPhoto */ },
  render: (resume, options) => string,
};
```

The module is registered by adding the export to `themes/registry.ts`.

## Files per theme

- `index.ts` — the `Theme` export (meta + the render reference)
- `styles.ts` — the `buildStyles(customization)` function producing the
  per-instance CSS string. Inline `@import url(...)` for Google Fonts.
- `render.ts` — the render function (pure, no I/O)

## Rules

- Render functions MUST escape every user-provided string via `escapeHtml` /
  `escapeAttr` from `../_shared/htmlEscape`.
- Render functions MUST include `<style data-base>{BASE_PRINT_CSS}</style>` and
  `<style data-theme="...">{themeCss}</style>`.
- Apply `atsOverridesCss(options.atsMode)` as a final cascade layer.
- `defaultCustomization` MUST validate against `customizationSchema`.
- Add three test files (`index.test.ts`, `styles.test.ts`, `render.test.ts`)
  mirroring `atelier-classique`.
- Register the theme in `registry.ts` and verify via `bun run test:themes`.

## ATS profiles

Declare the strictest mode your theme can render without visual collapse via
`atsProfile.minSupported`:

- `ats-strict` — single column, system fonts, no decorative ornaments,
  no photo. Required for ATS-first themes.
- `ats-balanced` — accents + photos + structured headings; decorative
  ornaments hidden.
- `expressive` — full theme expression; may degrade ATS parsing.

The PDF route refuses to render a theme in a mode below its `minSupported`.

## Customization schema

Keep customization to **enums only**. Do NOT expose free-form hex inputs — the
controlled-customization principle is what makes the new theme system
maintainable.
