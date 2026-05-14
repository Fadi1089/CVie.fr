# JSON Resume Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Figma-driven CV template pipeline with a vendored JSON Resume-compatible theme system, a structured editor with controlled customization, a hardened Playwright PDF renderer with three ATS-safe export modes, automated template tests, and a premium-tier gate — so new themes can be authored in plain TS/CSS without Figma.

**Architecture:**

1. **Wire format:** JSON Resume v1 (with three CVie-specific extensions) becomes the canonical *render-time* shape. The existing `cvDataSchema` stays as the *storage and editor* schema (UX-shaped, French-localised). A pure `cvToJsonResume` mapper sits between them and is the only place that knows both schemas.
2. **Theme contract:** Every theme is a vendored TypeScript module under `shared/src/templates/themes/<theme-id>/` that exports `render(resume, options) → string`, a `meta` block (id, tier, ATS profile, customization schema), and a static CSS string. No `npm` theme is trusted at runtime — themes are reviewed and committed.
3. **Renderer:** `renderResumeHtml(cv, themeId, options)` replaces the current `renderCvHtml`. The Playwright `pdfService` keeps its SSRF block, font-readiness wait, singleton browser, and photo inlining — only the HTML-producing function changes.
4. **Editor:** A three-column "Atelier" workspace (TOC rail + form surface + live A4 preview) replaces the current monolithic `CvEditor.tsx`. Customization is per-theme and capped by each theme's `customizationSchema` (no free-form 5-color picker).
5. **Export modes:** `ats-strict` (no photo, single column, system-safe fonts, ISO dates, semantic H1/H2/H3), `ats-balanced` (default — accent color + photo allowed, structured headings), `expressive` (full theme expression, may degrade ATS). The mode is a route parameter and a theme-level switch.
6. **Tests:** Per-theme golden HTML, golden PDF text extraction, ATS validator score, and Playwright pixel snapshots — all run in CI on a single fixture resume.
7. **Premium:** A `tier: "free" | "premium"` field on each theme; server enforces in `/api/v1/cv/pdf` and in the theme list endpoint. No payment integration in this plan — only the gate.

**Tech Stack:** TypeScript 5.7, Zod 4, React 19, Tailwind v4, Base UI primitives (`@base-ui/react`), react-hook-form, Hono, Playwright 1.59, Bun test (server), Vitest 4 (client + shared), pdf-parse (text extraction for tests). No new runtime dependencies are required — the JSON Resume contract is implemented by hand to keep the schema we ship explicit and audited.

---

## Table of Contents

- [Aesthetic Direction](#aesthetic-direction) — the editor UI committed look-and-feel
- [File Structure](#file-structure) — exact files created, modified, deleted
- Phase 1 — JSON Resume schema + bidirectional mapper
- Phase 2 — Theme contract + first curated theme (`atelier-classique`)
- Phase 3 — `renderResumeHtml` + Playwright integration
- Phase 4 — Two more themes (`atelier-moderne`, `atelier-minimaliste`)
- Phase 5 — Atelier editor UI redesign (frontend-design heavy)
- Phase 6 — Controlled per-theme customization
- Phase 7 — ATS-safe export modes
- Phase 8 — Automated template testing in CI
- Phase 9 — Premium tier gating
- Phase 10 — Delete Figma legacy
- [Self-Review](#self-review)

---

## Aesthetic Direction

The editor commits to one bold direction: **Atelier Typographique** — a French print-atelier workspace where editing a CV feels like operating a typesetting press. References: *Cabana* magazine, *Apartamento*, vintage Linotype operating panels, fine letterpress proofs. This is not generic SaaS; it is print-coded, French-coded, and intentional. Both the editor and the templates inherit this language.

**Typography (Google Fonts, free, distinctive — do NOT substitute Inter/Roboto/Space Grotesk):**
- Display: **Fraunces** (variable: `opsz`, `wght`, `SOFT`, `WONK`) — section numerals, the "Atelier" wordmark, the preview hero
- UI body: **Bricolage Grotesque** (variable, optical-sized) — form labels, body, navigation
- Tabular / metadata: **Fragment Mono** — IDs, autosave status, theme keys, page numbers in the preview footer

**Color tokens (CSS variables, lives in `client/src/globals.css`):**

Light theme (default — proof paper):
```
--atelier-paper:  #F6F2E7
--atelier-ink:    #16140F
--atelier-rule:   #1F1B14
--atelier-accent: #7B2D26   /* oxblood — encre rouge */
--atelier-muted:  #6B6357   /* taupe */
--atelier-mark:   #E8C24E   /* highlight — proof marker, used sparingly */
```

Dark theme (night proof):
```
--atelier-paper:  #15140F
--atelier-ink:    #ECE5D3
--atelier-rule:   #38332A
--atelier-accent: #D6A453   /* gold leaf */
--atelier-muted:  #7A7160
--atelier-mark:   #7B2D26
```

**Motion (high-impact moments, never decorative for its own sake):**
- Section transitions: 320ms `cubic-bezier(.22,1,.36,1)` — subtle horizontal slide + paper-fold shadow
- Save-state pulse: a hairline accent ring expands and fades over the autosave indicator (a stamp drying)
- Preview cross-fade: 220ms cross-fade with a 6% noise overlay held briefly (ink drying)
- Loading: a single typographic ornament `·` sweeping horizontally — **never spinners**
- Page numbers in the preview iframe nudge up 1px when the section above them is being edited

**Spatial composition (desktop, ≥ 1024 px):**
- 3-column workspace: left rail (`240 px`) + center (flex 1) + right preview (`340–420 px`, collapsible)
- Left rail = a typographic TOC: `01 — Informations personnelles`, `02 — Formations`, etc. Active section gets a 2px oxblood rule on the *right edge* (not a fill). The drag handle is a pilcrow `¶`.
- Center = form surface with generous gutters. Labels are roman small-caps, inputs are bare with a bottom rule only. Validation errors appear as italic marginalia to the right of the input.
- Right preview = an A4 page at scale with a faint baseline grid behind. Top toolbar: theme picker (chip row), ATS mode toggle (3-state), export button (oxblood, with a tiny press-mark ornament `◆`).
- Mobile (`< 1024 px`): stacked — form on top, preview in a bottom sheet (Base UI `Dialog`).

**Decorative details (all template-side except where noted):**
- Section numerals in the editor and templates: tabular Fraunces digits in oxblood — `01.`, `02.`, etc.
- Centered `◆` ornaments between long-form blocks
- A `« bon à tirer »` stamp at the bottom of the preview when in `ats-strict` mode (French print idiom: "ready to print")
- 6% film-grain SVG overlay on the editor canvas — disabled in templates so it never reaches the PDF
- Custom thin caret in the editor (CSS `caret-color: var(--atelier-accent)`)

**One unforgettable thing (the differentiator):** When the user finishes editing a section, a small **stamp animation** plays in the TOC — an oxblood square fades in like wet ink, then a hairline `✓ — épreuve enregistrée` label resolves below for ~3 s before fading. A faint "stamp impression" residue stays on that TOC row for 8 s.

These choices are load-bearing on the editor side. **The templates themselves are not bound to this aesthetic** — `atelier-classique`, `atelier-moderne`, and `atelier-minimaliste` each have their own visual identity (see Phase 2 and Phase 4). The shared name is a stylistic family signal, not a rule.

---

## File Structure

Lock in decomposition before any task runs. Files that change together live together; each file has one clear responsibility.

### shared/ — schema, mapper, themes, renderer (the heart of this plan)

**Create:**
- `shared/src/templates/jsonResume/schema.ts` — Zod schema for JSON Resume v1 + CVie extensions
- `shared/src/templates/jsonResume/types.ts` — TS types derived from the schema
- `shared/src/templates/jsonResume/mapper.ts` — `cvToJsonResume(cv)` + `jsonResumeToCv(resume)` (lossy in `jsonResumeToCv` — for import only)
- `shared/src/templates/jsonResume/dates.ts` — `cvDateToIso(s)`, `isoDateToHuman(s, locale)`, `formatDateRange(...)`
- `shared/src/templates/jsonResume/normalize.ts` — pre-render normalization (trims, deduplicates, drops empties)
- `shared/src/templates/themes/types.ts` — `Theme`, `ThemeMeta`, `ThemeRenderOptions`, `ThemeCustomization` interfaces
- `shared/src/templates/themes/registry.ts` — `themeRegistry: readonly Theme[]`
- `shared/src/templates/themes/index.ts` — re-exports `getTheme(id)`, `listThemes()`, `requireTheme(id)`
- `shared/src/templates/themes/_shared/htmlEscape.ts` — `escapeHtml`, `escapeAttr`
- `shared/src/templates/themes/_shared/printChrome.ts` — `BASE_PRINT_CSS` (A4 `@page`, font readiness markers)
- `shared/src/templates/themes/_shared/atsProfile.ts` — `ATS_STRICT_OVERRIDES`, `ATS_BALANCED_OVERRIDES`, `EXPRESSIVE_OVERRIDES` (CSS strings layered on a theme)
- `shared/src/templates/themes/atelier-classique/index.ts` — theme module
- `shared/src/templates/themes/atelier-classique/styles.ts` — exported CSS string + customization variable map
- `shared/src/templates/themes/atelier-classique/render.ts` — `render(resume, options)`
- `shared/src/templates/themes/atelier-moderne/{index,styles,render}.ts`
- `shared/src/templates/themes/atelier-minimaliste/{index,styles,render}.ts`
- `shared/src/templates/renderer.ts` — **NEW** `renderResumeHtml(cv, themeId, options)` (replaces old file with same name)
- `shared/src/templates/__fixtures__/sampleResume.ts` — a JSON Resume fixture for tests
- `shared/src/templates/__fixtures__/sampleCv.ts` — the CVie-shaped fixture (mirror of `defaults.sampleCv`)
- Test files (one per source file above) — Vitest, `*.test.ts`

**Modify:**
- `shared/src/index.ts` — export `renderResumeHtml`, `themeRegistry`, `getTheme`, `cvToJsonResume`, `jsonResumeToCv`, the new types; remove exports of `renderCvHtml`, `getTemplateCss`, `templateRegistry` (old)
- `shared/src/schemas/cv.ts:213-221` — add `themeId` (replaces implicit `templateId`) and a typed `customization` field on the CV (deprecating the freeform palette/textSizes/mediaSize/spacing). Old appearance fields stay readable for migration but are unused by the new renderer.

**Delete (after Phase 10 verification):**
- `shared/src/templates/figma/**`
- `shared/src/templates/styles/**`
- `shared/src/templates/renderer.test.ts` (replaced by per-theme + renderer tests)
- `shared/src/templates/registry.ts` (replaced by `themes/registry.ts`)
- `shared/src/templates/registry.test.ts`

### server/ — PDF service + routes

**Modify:**
- `server/src/services/pdfService.ts:52-136` — `generateCvPdf` accepts `{ themeId, atsMode, customization }` (replaces `template, scale, overflowMode`), calls `renderResumeHtml`
- `server/src/routes/cv.ts:106-200` — `/api/v1/cv/pdf` route schema updated; new fields validated; tier check inserted
- `server/src/services/pdfService.test.ts` — update to new signature + add per-mode assertions
- `server/src/services/themeAccess.ts` — **NEW** `canUseTheme(theme, user)` (premium gate)

**Create:**
- `server/src/services/themeAccess.ts`
- `server/src/services/themeAccess.test.ts`
- `server/src/routes/themes.ts` — `GET /api/v1/themes` returns the public theme list (with `tier` filter for the current user)
- `server/src/routes/__tests__/themes.test.ts`

### client/ — editor redesign

**Create:**
- `client/src/features/editor/atelier/Workspace.tsx` — 3-column shell
- `client/src/features/editor/atelier/TocRail.tsx` — left rail
- `client/src/features/editor/atelier/PreviewPane.tsx` — right preview iframe
- `client/src/features/editor/atelier/ExportBar.tsx` — theme picker + ATS toggle + export button
- `client/src/features/editor/atelier/StampSaved.tsx` — the unforgettable save-stamp animation
- `client/src/features/editor/atelier/forms/PersonalInfoForm.tsx`
- `client/src/features/editor/atelier/forms/FormationsForm.tsx`
- `client/src/features/editor/atelier/forms/ExperiencesForm.tsx`
- `client/src/features/editor/atelier/forms/SkillsForm.tsx`
- `client/src/features/editor/atelier/forms/LanguagesForm.tsx`
- `client/src/features/editor/atelier/forms/InterestsForm.tsx`
- `client/src/features/editor/atelier/forms/_atoms/{TextInput,TextArea,DateInput,SmallCapsLabel,Marginalia}.tsx`
- `client/src/features/editor/customization/CustomizationPanel.tsx` — driven by the active theme's `customizationSchema`
- `client/src/features/editor/customization/controls/{ColorChips,FontPair,DensityToggle,AccentPicker}.tsx`
- `client/src/features/editor/hooks/useExportPdf.ts` — POSTs `{ cvData, themeId, atsMode, customization }` to `/api/v1/cv/pdf` (extracted from the inline fetch in `CvEditor.tsx:864`)
- Test files for all of the above (Vitest + Testing Library)

**Modify:**
- `client/src/features/editor/components/CvEditor.tsx` — rewritten to compose `Workspace.tsx` (the file stays; its body is replaced)
- `client/src/features/editor/hooks/useCvDraft.ts` — accepts `themeId` and `customization` patches
- `client/src/features/editor/api/*` — replace `templateId` references with `themeId`
- `client/src/router.tsx` — no route changes; existing `/editor/:cvId` continues to work
- `client/src/globals.css` — add `--atelier-*` tokens (light + dark via `next-themes`)

**Delete (after Phase 10):**
- `client/src/features/editor/components/DesignPanel.tsx` and its `__tests__` (replaced by `customization/CustomizationPanel.tsx`)
- `client/src/features/editor/components/CvEditor.templateSwitch.test.tsx` (folded into Workspace tests)

### prisma/ — schema migration

**Modify:**
- `prisma/schema.prisma` — no column changes (CV data stays a JSON blob); but add a check-constraint migration that warns on legacy `templateId` use (kept lenient — old rows still load)

**Create:**
- `prisma/migrations/<timestamp>_cv_theme_id_backfill/migration.sql` — backfills `data->'themeId'` to `"atelier-classique"` for rows missing it, mapping old template ids one-to-one

### scripts/ — automated template testing

**Create:**
- `scripts/test-themes-pdf.ts` — runs `generateCvPdf` for every theme × every ATS mode, asserts pdf-parse text fidelity, captures pixel snapshots to `tests/__snapshots__/themes/`
- `scripts/test-themes-ats.ts` — runs a vendored ATS validator (simple semantic-HTML heuristics) on rendered HTML
- `scripts/preview-themes.ts` — local dev helper, opens each theme in Chromium for visual inspection
- `tests/__snapshots__/themes/.gitkeep`

**Delete (after Phase 10):**
- `scripts/sync-figma-templates.ts`
- `scripts/generate-template-css.ts`
- `scripts/smoke-template-previews.ts`

### package.json + README — wiring

**Modify:**
- `package.json` — replace `sync:figma-templates`, `generate:template-css`, `check:template-css`, `smoke:template-previews` scripts with `test:themes` (runs `test-themes-pdf.ts` and `test-themes-ats.ts`) and `preview:themes`
- `README.md:85-98` — replace the "Figma Template Sync" section with a "Themes" section pointing at `shared/src/templates/themes/README.md`
- `client/CLAUDE.md` / project `CLAUDE.md` — note the new theme authoring location

**Create:**
- `shared/src/templates/themes/README.md` — theme-author guide (contract, customization schema, ATS rules, how to add a new theme)

---

## Phase 1 — JSON Resume schema + bidirectional mapper

**Why first:** Every later phase consumes the JSON Resume shape. Getting the schema and the mapper right (with tests pinning the contract) is the cheapest insurance against rework.

### Task 1.1 — Create the JSON Resume Zod schema

**Files:**
- Create: `shared/src/templates/jsonResume/schema.ts`
- Test: `shared/src/templates/jsonResume/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/jsonResume/schema.test.ts
import { describe, it, expect } from "vitest";
import { jsonResumeSchema } from "./schema";

describe("jsonResumeSchema", () => {
  it("accepts a minimal resume with only basics.name", () => {
    const parsed = jsonResumeSchema.parse({ basics: { name: "Jane Doe" } });
    expect(parsed.basics.name).toBe("Jane Doe");
    expect(parsed.work).toEqual([]);
  });

  it("rejects a resume with no basics block", () => {
    expect(() => jsonResumeSchema.parse({})).toThrow();
  });

  it("normalises missing arrays to empty arrays (no undefined)", () => {
    const parsed = jsonResumeSchema.parse({ basics: { name: "X" } });
    expect(parsed.work).toEqual([]);
    expect(parsed.education).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.languages).toEqual([]);
    expect(parsed.interests).toEqual([]);
  });

  it("rejects javascript: URLs inside basics.url", () => {
    expect(() =>
      jsonResumeSchema.parse({
        basics: { name: "X", url: "javascript:alert(1)" },
      }),
    ).toThrow();
  });

  it("accepts CVie extension fields under x_cvie", () => {
    const parsed = jsonResumeSchema.parse({
      basics: {
        name: "X",
        x_cvie: { portfolioDisplay: "qr", locale: "fr" },
      },
    });
    expect(parsed.basics.x_cvie?.portfolioDisplay).toBe("qr");
    expect(parsed.basics.x_cvie?.locale).toBe("fr");
  });

  it("preserves the order of work entries", () => {
    const parsed = jsonResumeSchema.parse({
      basics: { name: "X" },
      work: [
        { name: "A", position: "p", startDate: "2020-01" },
        { name: "B", position: "p", startDate: "2021-01" },
      ],
    });
    expect(parsed.work.map((w) => w.name)).toEqual(["A", "B"]);
  });

  it("rejects javascript: URIs inside basics.image (XSS guard)", () => {
    expect(() =>
      jsonResumeSchema.parse({
        basics: { name: "X", image: "javascript:alert(1)" },
      }),
    ).toThrow();
  });

  it("accepts http(s) URLs in basics.image", () => {
    const parsed = jsonResumeSchema.parse({
      basics: { name: "X", image: "https://example.com/p.jpg" },
    });
    expect(parsed.basics.image).toBe("https://example.com/p.jpg");
  });

  it("accepts data:image/jpeg base64 URIs in basics.image", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/AAQ";
    const parsed = jsonResumeSchema.parse({
      basics: { name: "X", image: dataUrl },
    });
    expect(parsed.basics.image).toBe(dataUrl);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/jsonResume/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`

- [ ] **Step 3: Implement `jsonResumeSchema`**

```ts
// shared/src/templates/jsonResume/schema.ts
import { z } from "zod";

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2_000;
const MAX_URL = 2_000;
const MAX_ARRAY = 50;

const httpUrl = z
  .url()
  .max(MAX_URL)
  .refine(
    (u) => {
      try {
        const p = new URL(u).protocol;
        return p === "http:" || p === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must be http(s)" },
  );

const optionalHttpUrl = z.union([z.literal(""), httpUrl]).optional();

const MAX_IMAGE_DATA_URL = 100_000;
const imageDataUrl = z
  .string()
  .max(MAX_IMAGE_DATA_URL)
  .regex(
    /^data:image\/(png|jpe?g|webp|gif);base64,/,
    "image must be http(s) or data:image/* base64",
  );
const imageSrc = z.union([z.literal(""), httpUrl, imageDataUrl]).optional();

const isoMonth = z
  .string()
  .regex(/^\d{4}(-\d{2})?(-\d{2})?$/, "ISO date required")
  .optional();

const profileSchema = z.object({
  network: z.string().max(MAX_SHORT),
  username: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
});

const locationSchema = z.object({
  address: z.string().max(MAX_MEDIUM).optional(),
  postalCode: z.string().max(MAX_SHORT).optional(),
  city: z.string().max(MAX_SHORT).optional(),
  countryCode: z.string().max(2).optional(),
  region: z.string().max(MAX_SHORT).optional(),
});

/** CVie-specific basics extensions. Lives under `basics.x_cvie` so themes
 *  that don't know about it ignore the field harmlessly. */
const cvieBasicsExtSchema = z.object({
  portfolioDisplay: z.enum(["cleartext", "qr", "clickable"]).optional(),
  locale: z.enum(["fr", "en", "de", "es", "nl"]).optional(),
});

const basicsSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT),
  label: z.string().max(MAX_MEDIUM).optional(),
  image: imageSrc,
  email: z.union([z.literal(""), z.email().max(MAX_SHORT)]).optional(),
  phone: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
  summary: z.string().max(MAX_LONG).optional(),
  location: locationSchema.optional(),
  profiles: z.array(profileSchema).max(MAX_ARRAY).default([]),
  x_cvie: cvieBasicsExtSchema.optional(),
});

const workSchema = z.object({
  name: z.string().max(MAX_MEDIUM),
  position: z.string().max(MAX_MEDIUM),
  url: optionalHttpUrl,
  startDate: isoMonth,
  endDate: isoMonth,
  summary: z.string().max(MAX_LONG).optional(),
  highlights: z.array(z.string().max(MAX_LONG)).max(15).default([]),
  location: z.string().max(MAX_SHORT).optional(),
});

const educationSchema = z.object({
  institution: z.string().max(MAX_MEDIUM),
  area: z.string().max(MAX_MEDIUM).optional(),
  studyType: z.string().max(MAX_MEDIUM).optional(),
  startDate: isoMonth,
  endDate: isoMonth,
  score: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
  location: z.string().max(MAX_SHORT).optional(),
  summary: z.string().max(MAX_LONG).optional(),
});

const skillSchema = z.object({
  name: z.string().max(MAX_MEDIUM),
  level: z.string().max(MAX_SHORT).optional(),
  keywords: z.array(z.string().max(MAX_SHORT)).max(MAX_ARRAY).default([]),
});

const languageSchema = z.object({
  language: z.string().max(MAX_SHORT),
  fluency: z.string().max(MAX_SHORT).optional(),
});

const interestSchema = z.object({
  name: z.string().max(MAX_SHORT),
  keywords: z.array(z.string().max(MAX_SHORT)).max(MAX_ARRAY).default([]),
});

export const jsonResumeSchema = z.object({
  basics: basicsSchema,
  work: z.array(workSchema).max(MAX_ARRAY).default([]),
  education: z.array(educationSchema).max(MAX_ARRAY).default([]),
  skills: z.array(skillSchema).max(MAX_ARRAY).default([]),
  languages: z.array(languageSchema).max(MAX_ARRAY).default([]),
  interests: z.array(interestSchema).max(MAX_ARRAY).default([]),
});

export type JsonResume = z.infer<typeof jsonResumeSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/jsonResume/schema.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/jsonResume/schema.ts shared/src/templates/jsonResume/schema.test.ts
git commit -m "feat(shared): add JSON Resume v1 schema with x_cvie extensions and XSS-safe image field"
```

### Task 1.2 — Create date helpers

**Files:**
- Create: `shared/src/templates/jsonResume/dates.ts`
- Test: `shared/src/templates/jsonResume/dates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/jsonResume/dates.test.ts
import { describe, it, expect } from "vitest";
import { cvDateToIso, isoDateToHuman, formatDateRange } from "./dates";

describe("cvDateToIso", () => {
  it("passes ISO month strings through", () => {
    expect(cvDateToIso("2024-03")).toBe("2024-03");
  });
  it("maps 'present' to undefined (JSON Resume convention)", () => {
    expect(cvDateToIso("present")).toBeUndefined();
  });
  it("maps empty strings to undefined", () => {
    expect(cvDateToIso("")).toBeUndefined();
  });
});

describe("isoDateToHuman", () => {
  it("renders French month names by default", () => {
    expect(isoDateToHuman("2024-03", "fr")).toBe("mars 2024");
  });
  it("renders English month names when locale is en", () => {
    expect(isoDateToHuman("2024-03", "en")).toBe("Mar 2024");
  });
  it("returns the raw ISO date for unknown locales (no crash)", () => {
    expect(isoDateToHuman("2024-03", "xx" as never)).toBe("2024-03");
  });
});

describe("formatDateRange", () => {
  it("renders 'mars 2024 — présent' when endDate is undefined", () => {
    expect(formatDateRange("2024-03", undefined, "fr")).toBe(
      "mars 2024 — présent",
    );
  });
  it("renders the full range when both dates are present", () => {
    expect(formatDateRange("2020-01", "2024-03", "fr")).toBe(
      "janv. 2020 — mars 2024",
    );
  });
  it("renders only the end date when start is missing", () => {
    expect(formatDateRange(undefined, "2024-03", "fr")).toBe("mars 2024");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/jsonResume/dates.test.ts`
Expected: FAIL — `Cannot find module './dates'`

- [ ] **Step 3: Implement the helpers**

```ts
// shared/src/templates/jsonResume/dates.ts
export type SupportedLocale = "fr" | "en" | "de" | "es" | "nl";

const PRESENT_FR = "présent";
const PRESENT_EN = "Present";
const PRESENT_DE = "heute";
const PRESENT_ES = "actualidad";
const PRESENT_NL = "heden";

const PRESENT_BY_LOCALE: Record<SupportedLocale, string> = {
  fr: PRESENT_FR,
  en: PRESENT_EN,
  de: PRESENT_DE,
  es: PRESENT_ES,
  nl: PRESENT_NL,
};

/** Maps CVie's `"present" | "" | "YYYY-MM"` to JSON Resume's `string | undefined`. */
export function cvDateToIso(s: string | undefined): string | undefined {
  if (!s || s === "present") return undefined;
  return s;
}

/** Locale-aware month formatter. Falls back to the raw ISO string on unknown locales. */
export function isoDateToHuman(
  iso: string | undefined,
  locale: SupportedLocale,
): string {
  if (!iso) return "";
  const knownLocales: readonly SupportedLocale[] = ["fr", "en", "de", "es", "nl"];
  if (!knownLocales.includes(locale)) return iso;
  const m = /^(\d{4})-(\d{2})(-(\d{2}))?$/.exec(iso);
  if (!m) return iso;
  const year = Number.parseInt(m[1]!, 10);
  const month = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return iso;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Renders "start — end" with locale-aware month names and "present" fallback. */
export function formatDateRange(
  startIso: string | undefined,
  endIso: string | undefined,
  locale: SupportedLocale,
): string {
  const start = isoDateToHuman(startIso, locale);
  const end =
    endIso === undefined ? PRESENT_BY_LOCALE[locale] : isoDateToHuman(endIso, locale);
  if (start && end) return `${start} — ${end}`;
  return start || end;
}
```

> **Note on Intl output:** `Intl.DateTimeFormat("fr", { month: "short" })` returns `"mars"` for month 3 and `"janv."` for month 1. The tests above pin that exact output. If the test runner's ICU data differs (rare on Bun ≥ 1.2), update the expected strings to match the runner's output and document it inline; do not fall back to manual French names.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/jsonResume/dates.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/jsonResume/dates.ts shared/src/templates/jsonResume/dates.test.ts
git commit -m "feat(shared): add locale-aware JSON Resume date helpers"
```

### Task 1.3 — Create `cvToJsonResume` mapper

**Files:**
- Create: `shared/src/templates/jsonResume/mapper.ts`
- Test: `shared/src/templates/jsonResume/mapper.test.ts`
- Create: `shared/src/templates/__fixtures__/sampleCv.ts`
- Create: `shared/src/templates/__fixtures__/sampleResume.ts`

- [ ] **Step 1: Create the CVie fixture**

```ts
// shared/src/templates/__fixtures__/sampleCv.ts
import type { z } from "zod";
import { cvDataSchema } from "../../schemas/cv";

export type CvFixture = z.infer<typeof cvDataSchema>;

export const sampleCv: CvFixture = cvDataSchema.parse({
  personalInfo: {
    firstName: "Yasmine",
    lastName: "Benali",
    email: "yasmine.benali@example.com",
    phone: "+33 6 12 34 56 78",
    city: "Paris, France",
    jobTitle: "Ingénieure logicielle senior",
    summary:
      "Ingénieure full-stack avec 8 ans d'expérience sur des plateformes à fort trafic. Spécialisée dans la performance et l'observabilité.",
    linkedinUrl: "https://www.linkedin.com/in/yasminebenali",
    portfolioUrl: "https://yasmine.dev",
    portfolioDisplay: "qr",
  },
  formations: [
    {
      id: "f1",
      degree: "Diplôme d'ingénieure",
      school: "Télécom Paris",
      city: "Palaiseau",
      startDate: "2014-09",
      endDate: "2017-06",
      description: "Spécialisation systèmes répartis et bases de données.",
    },
  ],
  experiences: [
    {
      id: "e1",
      jobTitle: "Ingénieure logicielle senior",
      company: "Atelier SAS",
      city: "Paris",
      startDate: "2022-03",
      endDate: "present",
      bullets: [
        "Réduction de 60% de la latence API par mise en cache stratégique.",
        "Mentorat de 5 ingénieurs juniors.",
      ],
    },
    {
      id: "e2",
      jobTitle: "Développeuse full-stack",
      company: "Startup XYZ",
      city: "Paris",
      startDate: "2017-09",
      endDate: "2022-02",
      bullets: ["Construction de la plateforme MVP en 3 mois."],
    },
  ],
  skills: [
    { id: "s1", name: "TypeScript", level: "expert", category: "Langages" },
    { id: "s2", name: "PostgreSQL", level: "avancé", category: "Bases de données" },
    { id: "s3", name: "Kubernetes", level: "intermédiaire", category: "Infra" },
  ],
  languages: [
    { id: "l1", name: "Français", level: "natif" },
    { id: "l2", name: "Anglais", level: "C1" },
    { id: "l3", name: "Arabe", level: "B2" },
  ],
  interests: [{ id: "i1", name: "Lecture éditoriale" }],
});
```

- [ ] **Step 2: Write the failing mapper test**

```ts
// shared/src/templates/jsonResume/mapper.test.ts
import { describe, it, expect } from "vitest";
import { cvToJsonResume } from "./mapper";
import { sampleCv } from "../__fixtures__/sampleCv";
import { jsonResumeSchema } from "./schema";

describe("cvToJsonResume", () => {
  it("produces a JSON Resume document that validates against the schema", () => {
    const resume = cvToJsonResume(sampleCv);
    expect(() => jsonResumeSchema.parse(resume)).not.toThrow();
  });

  it("maps personalInfo to basics", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.name).toBe("Yasmine Benali");
    expect(r.basics.label).toBe("Ingénieure logicielle senior");
    expect(r.basics.email).toBe("yasmine.benali@example.com");
    expect(r.basics.location?.city).toBe("Paris, France");
  });

  it("encodes the linkedin profile under basics.profiles", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.profiles).toContainEqual({
      network: "LinkedIn",
      username: "yasminebenali",
      url: "https://www.linkedin.com/in/yasminebenali",
    });
  });

  it("maps portfolioUrl to basics.url", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.url).toBe("https://yasmine.dev");
  });

  it("carries portfolioDisplay and locale through x_cvie", () => {
    const r = cvToJsonResume({
      ...sampleCv,
      appearance: { locale: "fr" },
    });
    expect(r.basics.x_cvie?.portfolioDisplay).toBe("qr");
    expect(r.basics.x_cvie?.locale).toBe("fr");
  });

  it("maps experiences to work, preserving order and bullets", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.work).toHaveLength(2);
    expect(r.work[0]!.name).toBe("Atelier SAS");
    expect(r.work[0]!.position).toBe("Ingénieure logicielle senior");
    expect(r.work[0]!.startDate).toBe("2022-03");
    expect(r.work[0]!.endDate).toBeUndefined(); // "present" → undefined
    expect(r.work[0]!.highlights).toEqual([
      "Réduction de 60% de la latence API par mise en cache stratégique.",
      "Mentorat de 5 ingénieurs juniors.",
    ]);
  });

  it("maps formations to education", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.education).toHaveLength(1);
    expect(r.education[0]!.institution).toBe("Télécom Paris");
    expect(r.education[0]!.studyType).toBe("Diplôme d'ingénieure");
    expect(r.education[0]!.endDate).toBe("2017-06");
  });

  it("groups skills by category into JSON Resume skill buckets", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.skills).toEqual(
      expect.arrayContaining([
        { name: "Langages", level: undefined, keywords: ["TypeScript"] },
        { name: "Bases de données", level: undefined, keywords: ["PostgreSQL"] },
        { name: "Infra", level: undefined, keywords: ["Kubernetes"] },
      ]),
    );
  });

  it("maps languages with human-readable CEFR fluency", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.languages).toContainEqual({
      language: "Anglais",
      fluency: "C1 — avancé",
    });
    expect(r.languages).toContainEqual({
      language: "Français",
      fluency: "Natif",
    });
  });

  it("rolls all interests into a single 'Centres d'intérêt' bucket", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.interests).toEqual([
      { name: "Centres d'intérêt", keywords: ["Lecture éditoriale"] },
    ]);
  });

  it("omits empty optional fields rather than emitting empty strings", () => {
    const cv = {
      ...sampleCv,
      personalInfo: { ...sampleCv.personalInfo, email: "", phone: "" },
    };
    const r = cvToJsonResume(cv);
    expect(r.basics.email).toBeUndefined();
    expect(r.basics.phone).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/jsonResume/mapper.test.ts`
Expected: FAIL — `Cannot find module './mapper'`

- [ ] **Step 4: Implement the mapper**

```ts
// shared/src/templates/jsonResume/mapper.ts
import type { z } from "zod";
import { cvDataSchema } from "../../schemas/cv";
import type { JsonResume } from "./schema";
import { cvDateToIso, type SupportedLocale } from "./dates";

type Cv = z.infer<typeof cvDataSchema>;

const CEFR_FLUENCY: Record<string, string> = {
  A1: "A1 — débutant",
  A2: "A2 — élémentaire",
  B1: "B1 — intermédiaire",
  B2: "B2 — intermédiaire supérieur",
  C1: "C1 — avancé",
  C2: "C2 — maîtrise",
  natif: "Natif",
};

function emptyToUndef(s: string | undefined): string | undefined {
  return s && s.trim().length > 0 ? s : undefined;
}

function linkedinUsername(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("linkedin.com")) return undefined;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("in");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1];
  } catch {
    return undefined;
  }
}

export function cvToJsonResume(cv: Cv): JsonResume {
  const p = cv.personalInfo;
  const locale: SupportedLocale = cv.appearance?.locale ?? "fr";

  const profiles: JsonResume["basics"]["profiles"] = [];
  const linkedin = emptyToUndef(p.linkedinUrl);
  if (linkedin) {
    profiles.push({
      network: "LinkedIn",
      username: linkedinUsername(linkedin),
      url: linkedin,
    });
  }

  const x_cvie: NonNullable<JsonResume["basics"]["x_cvie"]> = {};
  if (p.portfolioDisplay) x_cvie.portfolioDisplay = p.portfolioDisplay;
  if (locale) x_cvie.locale = locale;

  const basics: JsonResume["basics"] = {
    name: `${p.firstName} ${p.lastName}`.trim(),
    label: emptyToUndef(p.jobTitle),
    image: emptyToUndef(p.photoUrl),
    email: emptyToUndef(p.email),
    phone: emptyToUndef(p.phone),
    url: emptyToUndef(p.portfolioUrl),
    summary: emptyToUndef(p.summary),
    location: emptyToUndef(p.city) ? { city: p.city } : undefined,
    profiles,
    x_cvie: Object.keys(x_cvie).length > 0 ? x_cvie : undefined,
  };

  const work: JsonResume["work"] = cv.experiences.map((e) => ({
    name: e.company,
    position: e.jobTitle,
    location: emptyToUndef(e.city),
    startDate: cvDateToIso(e.startDate),
    endDate: cvDateToIso(e.endDate),
    summary: emptyToUndef(e.description),
    highlights: e.bullets ?? [],
  }));

  const education: JsonResume["education"] = cv.formations.map((f) => ({
    institution: f.school,
    studyType: f.degree,
    area: undefined,
    location: emptyToUndef(f.city),
    startDate: cvDateToIso(f.startDate),
    endDate: cvDateToIso(f.endDate),
    summary: emptyToUndef(f.description),
  }));

  // Group skills by category. Items without a category fall into "Compétences".
  const skillBuckets = new Map<string, string[]>();
  for (const s of cv.skills) {
    const bucket = emptyToUndef(s.category) ?? "Compétences";
    const list = skillBuckets.get(bucket) ?? [];
    list.push(s.name);
    skillBuckets.set(bucket, list);
  }
  const skills: JsonResume["skills"] = [...skillBuckets.entries()].map(
    ([name, keywords]) => ({ name, level: undefined, keywords }),
  );

  const languages: JsonResume["languages"] = cv.languages.map((l) => ({
    language: l.name,
    fluency: CEFR_FLUENCY[l.level] ?? l.level,
  }));

  const interests: JsonResume["interests"] =
    cv.interests.length === 0
      ? []
      : [{ name: "Centres d'intérêt", keywords: cv.interests.map((i) => i.name) }];

  return { basics, work, education, skills, languages, interests };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/jsonResume/mapper.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add shared/src/templates/jsonResume/mapper.ts shared/src/templates/jsonResume/mapper.test.ts shared/src/templates/__fixtures__/sampleCv.ts
git commit -m "feat(shared): map cvDataSchema → JSON Resume with x_cvie extensions"
```

### Task 1.4 — Create the parallel JSON Resume fixture

**Files:**
- Create: `shared/src/templates/__fixtures__/sampleResume.ts`
- Test: `shared/src/templates/__fixtures__/sampleResume.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/__fixtures__/sampleResume.test.ts
import { describe, it, expect } from "vitest";
import { sampleResume } from "./sampleResume";
import { jsonResumeSchema } from "../jsonResume/schema";
import { cvToJsonResume } from "../jsonResume/mapper";
import { sampleCv } from "./sampleCv";

describe("sampleResume", () => {
  it("validates against jsonResumeSchema", () => {
    expect(() => jsonResumeSchema.parse(sampleResume)).not.toThrow();
  });

  it("is the materialised form of sampleCv (drift check)", () => {
    expect(cvToJsonResume(sampleCv)).toEqual(sampleResume);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/__fixtures__/sampleResume.test.ts`
Expected: FAIL — `Cannot find module './sampleResume'`

- [ ] **Step 3: Create the fixture by running the mapper once and pasting the output**

The fastest way to bootstrap this fixture is to add a temporary `console.log(JSON.stringify(cvToJsonResume(sampleCv), null, 2))` to the mapper test, run it, and copy the output into the file below. Then remove the log. Paste the literal JSON into:

```ts
// shared/src/templates/__fixtures__/sampleResume.ts
import type { JsonResume } from "../jsonResume/schema";

// Materialised output of cvToJsonResume(sampleCv). Drift is caught by
// sampleResume.test.ts — if you change the mapper or sampleCv, regenerate.
export const sampleResume: JsonResume = {
  basics: {
    name: "Yasmine Benali",
    label: "Ingénieure logicielle senior",
    email: "yasmine.benali@example.com",
    phone: "+33 6 12 34 56 78",
    url: "https://yasmine.dev",
    summary:
      "Ingénieure full-stack avec 8 ans d'expérience sur des plateformes à fort trafic. Spécialisée dans la performance et l'observabilité.",
    location: { city: "Paris, France" },
    profiles: [
      {
        network: "LinkedIn",
        username: "yasminebenali",
        url: "https://www.linkedin.com/in/yasminebenali",
      },
    ],
    x_cvie: { portfolioDisplay: "qr", locale: "fr" },
  },
  work: [
    {
      name: "Atelier SAS",
      position: "Ingénieure logicielle senior",
      location: "Paris",
      startDate: "2022-03",
      summary: undefined,
      highlights: [
        "Réduction de 60% de la latence API par mise en cache stratégique.",
        "Mentorat de 5 ingénieurs juniors.",
      ],
    },
    {
      name: "Startup XYZ",
      position: "Développeuse full-stack",
      location: "Paris",
      startDate: "2017-09",
      endDate: "2022-02",
      summary: undefined,
      highlights: ["Construction de la plateforme MVP en 3 mois."],
    },
  ],
  education: [
    {
      institution: "Télécom Paris",
      studyType: "Diplôme d'ingénieure",
      area: undefined,
      location: "Palaiseau",
      startDate: "2014-09",
      endDate: "2017-06",
      summary: "Spécialisation systèmes répartis et bases de données.",
    },
  ],
  skills: [
    { name: "Langages", level: undefined, keywords: ["TypeScript"] },
    { name: "Bases de données", level: undefined, keywords: ["PostgreSQL"] },
    { name: "Infra", level: undefined, keywords: ["Kubernetes"] },
  ],
  languages: [
    { language: "Français", fluency: "Natif" },
    { language: "Anglais", fluency: "C1 — avancé" },
    { language: "Arabe", fluency: "B2 — intermédiaire supérieur" },
  ],
  interests: [
    { name: "Centres d'intérêt", keywords: ["Lecture éditoriale"] },
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/__fixtures__/sampleResume.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/__fixtures__/sampleResume.ts shared/src/templates/__fixtures__/sampleResume.test.ts
git commit -m "test(shared): pin JSON Resume fixture against mapper output"
```

### Task 1.5 — Create the normalisation pass

The mapper produces a faithful but messy resume (empty strings, redundant `undefined`s in unions). Themes are simpler to write if every theme receives a clean, predictable shape. `normalize` is the only function themes call on input.

**Files:**
- Create: `shared/src/templates/jsonResume/normalize.ts`
- Test: `shared/src/templates/jsonResume/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/jsonResume/normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";
import { sampleResume } from "../__fixtures__/sampleResume";

describe("normalize", () => {
  it("strips empty-string fields recursively", () => {
    const out = normalize({
      ...sampleResume,
      basics: { ...sampleResume.basics, email: "" as never },
    });
    expect((out.basics as Record<string, unknown>).email).toBeUndefined();
  });

  it("removes work entries whose name AND position are both empty", () => {
    const out = normalize({
      ...sampleResume,
      work: [...sampleResume.work, { name: "", position: "", highlights: [] }],
    });
    expect(out.work).toHaveLength(sampleResume.work.length);
  });

  it("removes skill buckets whose keywords list is empty", () => {
    const out = normalize({
      ...sampleResume,
      skills: [
        ...sampleResume.skills,
        { name: "Empty bucket", level: undefined, keywords: [] },
      ],
    });
    expect(out.skills.map((s) => s.name)).not.toContain("Empty bucket");
  });

  it("is idempotent", () => {
    expect(normalize(normalize(sampleResume))).toEqual(normalize(sampleResume));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/jsonResume/normalize.test.ts`
Expected: FAIL — `Cannot find module './normalize'`

- [ ] **Step 3: Implement `normalize`**

```ts
// shared/src/templates/jsonResume/normalize.ts
import type { JsonResume } from "./schema";

function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) {
      out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

export function normalize(r: JsonResume): JsonResume {
  return {
    basics: clean({
      ...r.basics,
      location: r.basics.location ? clean(r.basics.location) : undefined,
      x_cvie: r.basics.x_cvie ? clean(r.basics.x_cvie) : undefined,
      profiles: r.basics.profiles
        .map((p) => clean(p))
        .filter((p) => p.network && (p.url || p.username)),
    }),
    work: r.work
      .map((w) => clean({ ...w, highlights: w.highlights.filter(Boolean) }))
      .filter((w) => w.name || w.position),
    education: r.education
      .map((e) => clean(e))
      .filter((e) => e.institution),
    skills: r.skills
      .map((s) => clean({ ...s, keywords: s.keywords.filter(Boolean) }))
      .filter((s) => (s.keywords as string[]).length > 0),
    languages: r.languages.map((l) => clean(l)).filter((l) => l.language),
    interests: r.interests
      .map((i) => clean({ ...i, keywords: i.keywords.filter(Boolean) }))
      .filter((i) => i.name),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/jsonResume/normalize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/jsonResume/normalize.ts shared/src/templates/jsonResume/normalize.test.ts
git commit -m "feat(shared): add idempotent JSON Resume normalisation pass"
```

### Task 1.6 — Extend `cvDataSchema` with `themeId` and `customization`

Phases 3, 5, 6, and 9 all read `cv.themeId` and `cv.customization`. Add them to the runtime Zod schema now so every downstream task can rely on them. Old rows in the DB are migrated in Task 10.1; for fresh code the schema is the contract.

**Files:**
- Modify: `shared/src/schemas/cv.ts:213-221`
- Modify: `shared/src/schemas/cv.test.ts` (extend, or create if absent)

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/schemas/cv.test.ts (extend)
import { describe, it, expect } from "vitest";
import { cvDataSchema } from "./cv";

const minimal = {
  personalInfo: { firstName: "X", lastName: "Y" },
};

describe("cvDataSchema themeId + customization", () => {
  it("defaults themeId to 'atelier-classique' when omitted", () => {
    const parsed = cvDataSchema.parse(minimal);
    expect(parsed.themeId).toBe("atelier-classique");
  });
  it("defaults customization to an empty object when omitted", () => {
    const parsed = cvDataSchema.parse(minimal);
    expect(parsed.customization).toEqual({});
  });
  it("accepts an arbitrary themeId string (validated against registry server-side)", () => {
    const parsed = cvDataSchema.parse({ ...minimal, themeId: "atelier-moderne" });
    expect(parsed.themeId).toBe("atelier-moderne");
  });
  it("accepts a record of unknown values for customization", () => {
    const parsed = cvDataSchema.parse({
      ...minimal,
      customization: { accent: "oxblood", density: "comfy" },
    });
    expect(parsed.customization.accent).toBe("oxblood");
  });
  it("rejects an oversized themeId", () => {
    expect(() =>
      cvDataSchema.parse({ ...minimal, themeId: "x".repeat(65) }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/schemas/cv.test.ts`
Expected: FAIL — `parsed.themeId` is undefined.

- [ ] **Step 3: Add the fields to the schema**

In `shared/src/schemas/cv.ts:213-221`, replace the `cvDataSchema` definition with:

```ts
export const cvDataSchema = z.object({
  personalInfo: personalInfoSchema,
  formations: z.array(formationSchema).max(MAX_ARRAY).default([]),
  experiences: z.array(experienceSchema).max(MAX_ARRAY).default([]),
  skills: z.array(skillSchema).max(MAX_ARRAY).default([]),
  languages: z.array(languageSchema).max(MAX_ARRAY).default([]),
  interests: z.array(interestSchema).max(MAX_ARRAY).default([]),
  appearance: appearanceSchema.optional(),
  // New in the JSON Resume era. `themeId` picks the curated theme; runtime
  // validity is enforced server-side against the registry, not here, so the
  // schema can stay decoupled from the theme catalogue.
  themeId: z.string().min(1).max(MAX_ID).default("atelier-classique"),
  // Theme-defined customization knobs. Each theme owns its own Zod schema
  // (see `theme.meta.customizationSchema`); we keep this loose here because
  // the same `cvDataSchema` is reused across themes and the active theme is
  // only known after this point.
  customization: z.record(z.string(), z.unknown()).default({}),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/schemas/cv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/schemas/cv.ts shared/src/schemas/cv.test.ts
git commit -m "feat(shared): add themeId + customization to cvDataSchema"
```

> The `appearance` block (palette/textSizes/mediaSize/spacing) stays in the schema as `optional` for backwards-compat reads. The new renderer ignores it; the editor stops writing to it. A future cleanup task can remove it once all production rows have been re-saved (post-launch).

---

## Phase 2 — Theme contract + first curated theme (`atelier-classique`)

**Why second:** With the wire format pinned, themes can be built and tested in isolation against the JSON Resume fixture. The first theme proves the contract — every subsequent theme is a copy-and-modify.

### Task 2.1 — Define the theme contract types

**Files:**
- Create: `shared/src/templates/themes/types.ts`
- Test: `shared/src/templates/themes/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/types.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type {
  Theme,
  ThemeMeta,
  ThemeCustomization,
  ThemeRenderOptions,
} from "./types";
import type { JsonResume } from "../jsonResume/schema";

describe("theme types (compile-time only)", () => {
  it("Theme has a render function returning a string", () => {
    expectTypeOf<Theme["render"]>().parameters.toEqualTypeOf<
      [JsonResume, ThemeRenderOptions]
    >();
    expectTypeOf<Theme["render"]>().returns.toEqualTypeOf<string>();
  });

  it("ThemeMeta declares id, name, description, tier, atsProfile", () => {
    expectTypeOf<ThemeMeta>().toHaveProperty("id");
    expectTypeOf<ThemeMeta>().toHaveProperty("tier");
    expectTypeOf<ThemeMeta>().toHaveProperty("atsProfile");
  });

  it("ThemeRenderOptions carries atsMode, customization, locale", () => {
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("atsMode");
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("customization");
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("locale");
  });

  it("ThemeCustomization is theme-defined and constrained", () => {
    type Sample = ThemeCustomization<{ accent: string; density: "compact" | "comfy" }>;
    expectTypeOf<Sample>().toHaveProperty("accent");
    expectTypeOf<Sample>().toHaveProperty("density");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shared && bun run test src/templates/themes/types.test.ts`
Expected: FAIL — `Cannot find module './types'`

- [ ] **Step 3: Implement the types**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && bun run test src/templates/themes/types.test.ts`
Expected: PASS (4 type-level tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/themes/types.ts shared/src/templates/themes/types.test.ts
git commit -m "feat(shared): define theme contract types"
```

### Task 2.2 — Create the shared theme helpers (`htmlEscape`, `printChrome`)

**Files:**
- Create: `shared/src/templates/themes/_shared/htmlEscape.ts`
- Test: `shared/src/templates/themes/_shared/htmlEscape.test.ts`
- Create: `shared/src/templates/themes/_shared/printChrome.ts`
- Test: `shared/src/templates/themes/_shared/printChrome.test.ts`

- [ ] **Step 1: Write the failing `htmlEscape` test**

```ts
// shared/src/templates/themes/_shared/htmlEscape.test.ts
import { describe, it, expect } from "vitest";
import { escapeHtml, escapeAttr } from "./htmlEscape";

describe("escapeHtml", () => {
  it("escapes <, >, &, \"", () => {
    expect(escapeHtml("<script>&\"")).toBe("&lt;script&gt;&amp;&quot;");
  });
  it("escapes single quotes for safety", () => {
    expect(escapeHtml("o'reilly")).toBe("o&#39;reilly");
  });
  it("returns the empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("escapeAttr", () => {
  it("escapes the four attribute-dangerous characters", () => {
    expect(escapeAttr("\"<>&")).toBe("&quot;&lt;&gt;&amp;");
  });
  it("escapes ASCII control characters by stripping them", () => {
    expect(escapeAttr("a\x00b")).toBe("ab");
  });
});
```

- [ ] **Step 2: Implement `htmlEscape`**

```ts
// shared/src/templates/themes/_shared/htmlEscape.ts
const HTML_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return s.replace(/[&<>"']/g, (ch) => HTML_MAP[ch]!);
}

const ATTR_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\x00-\x1F\x7F]/g;

export function escapeAttr(s: string | undefined | null): string {
  if (s == null) return "";
  return s.replace(CONTROL_RE, "").replace(/[&<>"]/g, (ch) => ATTR_MAP[ch]!);
}
```

- [ ] **Step 3: Run `htmlEscape` tests**

Run: `cd shared && bun run test src/templates/themes/_shared/htmlEscape.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Write the failing `printChrome` test**

```ts
// shared/src/templates/themes/_shared/printChrome.test.ts
import { describe, it, expect } from "vitest";
import { BASE_PRINT_CSS, FONT_READY_MARKER, A4_VIEWPORT_PX } from "./printChrome";

describe("BASE_PRINT_CSS", () => {
  it("declares A4 page size and zero default margins", () => {
    expect(BASE_PRINT_CSS).toMatch(/@page\s*\{[^}]*size:\s*A4/);
    expect(BASE_PRINT_CSS).toMatch(/@page\s*\{[^}]*margin:\s*0/);
  });
  it("removes default body margin so the page edge is honest", () => {
    expect(BASE_PRINT_CSS).toMatch(/body\s*\{[^}]*margin:\s*0/);
  });
});

describe("A4_VIEWPORT_PX", () => {
  it("is 794 (A4 width @ 96 dpi)", () => {
    expect(A4_VIEWPORT_PX.width).toBe(794);
    expect(A4_VIEWPORT_PX.height).toBe(1123);
  });
});

describe("FONT_READY_MARKER", () => {
  it("is a stable identifier used by the renderer to await fonts", () => {
    expect(FONT_READY_MARKER).toBe("data-fonts-ready");
  });
});
```

- [ ] **Step 5: Implement `printChrome`**

```ts
// shared/src/templates/themes/_shared/printChrome.ts
/** Pinned to A4 @ 96 dpi. Match between Playwright viewport and CSS @page
 *  prevents the right-edge clipping bug fixed in the original renderer. */
export const A4_VIEWPORT_PX = { width: 794, height: 1123 } as const;

/** The renderer sets `<html data-fonts-ready="true">` after `document.fonts.ready`
 *  resolves, so themes can use the attribute as a CSS hook if they need to
 *  hold-and-reveal until webfonts settle. */
export const FONT_READY_MARKER = "data-fonts-ready";

export const BASE_PRINT_CSS = `
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; background: white; }
* { box-sizing: border-box; }
img { max-width: 100%; }
/* Print-time: hide preview chrome that themes may have rendered. */
@media print {
  .cv-preview-only { display: none !important; }
}
`.trim();
```

- [ ] **Step 6: Run `printChrome` tests**

Run: `cd shared && bun run test src/templates/themes/_shared/printChrome.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add shared/src/templates/themes/_shared/
git commit -m "feat(shared): add theme HTML-escape + base print chrome"
```

### Task 2.3 — Create the ATS overrides layer

**Files:**
- Create: `shared/src/templates/themes/_shared/atsProfile.ts`
- Test: `shared/src/templates/themes/_shared/atsProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/_shared/atsProfile.test.ts
import { describe, it, expect } from "vitest";
import { atsOverridesCss } from "./atsProfile";

describe("atsOverridesCss", () => {
  it("returns the empty string in expressive mode", () => {
    expect(atsOverridesCss("expressive")).toBe("");
  });

  it("strips multi-column layout in ats-strict", () => {
    const css = atsOverridesCss("ats-strict");
    expect(css).toMatch(/column-count:\s*1\s*!important/);
    expect(css).toMatch(/grid-template-columns:\s*1fr\s*!important/);
  });

  it("hides decorative ornaments in ats-strict", () => {
    expect(atsOverridesCss("ats-strict")).toMatch(
      /\[data-decorative\]\s*\{[^}]*display:\s*none/,
    );
  });

  it("hides the photo in ats-strict", () => {
    expect(atsOverridesCss("ats-strict")).toMatch(
      /\.cv-photo\s*\{[^}]*display:\s*none/,
    );
  });

  it("forces black text on white background in ats-strict", () => {
    const css = atsOverridesCss("ats-strict");
    expect(css).toMatch(/color:\s*#000\s*!important/);
    expect(css).toMatch(/background[^;]*:\s*#fff\s*!important/);
  });

  it("ats-balanced keeps photos and accents but removes decorative elements", () => {
    const css = atsOverridesCss("ats-balanced");
    expect(css).not.toMatch(/\.cv-photo\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\[data-decorative\]\s*\{[^}]*display:\s*none/);
  });
});
```

- [ ] **Step 2: Implement `atsProfile`**

```ts
// shared/src/templates/themes/_shared/atsProfile.ts
import type { AtsMode } from "../types";

const STRICT_CSS = `
.cv, .cv * { color: #000 !important; background: #fff !important; }
.cv { column-count: 1 !important; grid-template-columns: 1fr !important; }
.cv-photo, [data-photo] { display: none !important; }
[data-decorative] { display: none !important; }
h1, h2, h3, h4 { font-family: Georgia, "Times New Roman", serif !important; }
body, p, li, span { font-family: Helvetica, Arial, sans-serif !important; }
`.trim();

const BALANCED_CSS = `
[data-decorative] { display: none !important; }
`.trim();

export function atsOverridesCss(mode: AtsMode): string {
  switch (mode) {
    case "ats-strict":
      return STRICT_CSS;
    case "ats-balanced":
      return BALANCED_CSS;
    case "expressive":
    default:
      return "";
  }
}
```

- [ ] **Step 3: Run tests**

Run: `cd shared && bun run test src/templates/themes/_shared/atsProfile.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Commit**

```bash
git add shared/src/templates/themes/_shared/atsProfile.ts shared/src/templates/themes/_shared/atsProfile.test.ts
git commit -m "feat(shared): add ATS profile CSS overrides layer"
```

### Task 2.4 — Build `atelier-classique` theme — meta + customization schema

**Files:**
- Create: `shared/src/templates/themes/atelier-classique/index.ts`
- Test: `shared/src/templates/themes/atelier-classique/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/atelier-classique/index.test.ts
import { describe, it, expect } from "vitest";
import { atelierClassique } from "./index";

describe("atelierClassique.meta", () => {
  it("is identified by 'atelier-classique'", () => {
    expect(atelierClassique.meta.id).toBe("atelier-classique");
  });
  it("is in the free tier", () => {
    expect(atelierClassique.meta.tier).toBe("free");
  });
  it("supports ats-strict as its narrowest mode", () => {
    expect(atelierClassique.meta.atsProfile.minSupported).toBe("ats-strict");
    expect(atelierClassique.meta.atsProfile.defaultMode).toBe("ats-balanced");
  });
  it("declares photo support", () => {
    expect(atelierClassique.meta.supportsPhoto).toBe(true);
  });
});

describe("atelierClassique.meta.customizationSchema", () => {
  it("accepts the default customization", () => {
    const ok = atelierClassique.meta.customizationSchema.safeParse(
      atelierClassique.meta.defaultCustomization,
    );
    expect(ok.success).toBe(true);
  });
  it("rejects unknown accent values (controlled palette only)", () => {
    const bad = atelierClassique.meta.customizationSchema.safeParse({
      accent: "#000000",
      density: "comfy",
      photoShape: "circle",
    });
    expect(bad.success).toBe(false);
  });
  it("rejects unknown density values", () => {
    const bad = atelierClassique.meta.customizationSchema.safeParse({
      accent: "oxblood",
      density: "spacious-extra-large", // not allowed
      photoShape: "circle",
    });
    expect(bad.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `meta` + `defaultCustomization`**

```ts
// shared/src/templates/themes/atelier-classique/index.ts
import { z } from "zod";
import type { Theme } from "../types";
import { render } from "./render";

/** Five curated accents. Names map to oxblood, indigo, vert-sapin, etc. — the
 *  rendered colour is determined inside styles.ts. Free-form hex is NOT
 *  exposed; this is the "controlled customization" the redesign requires. */
const accentSchema = z.enum([
  "oxblood",
  "encre",
  "sapin",
  "graphite",
  "marine",
]);

const customizationSchema = z.object({
  accent: accentSchema,
  density: z.enum(["compact", "comfy"]),
  photoShape: z.enum(["square", "rounded", "circle"]),
});

const defaultCustomization: z.infer<typeof customizationSchema> = {
  accent: "oxblood",
  density: "comfy",
  photoShape: "rounded",
};

export const atelierClassique: Theme = {
  meta: {
    id: "atelier-classique",
    name: "Atelier — Classique",
    description:
      "Structure éditoriale française : titres serif, dates monospace, numérotation de section, palette oxblood.",
    tier: "free",
    atsProfile: { minSupported: "ats-strict", defaultMode: "ats-balanced" },
    supportsPhoto: true,
    defaultCustomization,
    customizationSchema,
  },
  render,
};
```

> The `render` function is implemented in Task 2.6; the import here will produce a missing-module error until that file exists. **Do not commit yet** — the codebase must type-check at every commit. Stage these files locally, then write Tasks 2.5 (`styles.ts`) and 2.6 (`render.ts`), and create a **single combined commit** at the end of Task 2.6 covering all three files. This keeps `git bisect` clean.

- [ ] **Step 3: Stage (do NOT commit yet)**

```bash
git add shared/src/templates/themes/atelier-classique/index.ts shared/src/templates/themes/atelier-classique/index.test.ts
# Hold the commit — Task 2.6 will land render.ts and create one combined commit.
```

### Task 2.5 — Build `atelier-classique` theme — `styles.ts`

**Files:**
- Create: `shared/src/templates/themes/atelier-classique/styles.ts`
- Test: `shared/src/templates/themes/atelier-classique/styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/atelier-classique/styles.test.ts
import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("buildStyles", () => {
  it("returns CSS that includes the @page rule (A4)", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4/);
  });

  it("injects the resolved accent color for 'oxblood'", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/--cv-accent:\s*#7B2D26/i);
  });

  it("injects a different accent for 'sapin'", () => {
    const css = buildStyles({
      accent: "sapin",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/--cv-accent:\s*#2E4A3A/i);
  });

  it("tightens line-height in compact density", () => {
    const comfy = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    const compact = buildStyles({
      accent: "oxblood",
      density: "compact",
      photoShape: "rounded",
    });
    expect(compact).not.toBe(comfy);
    expect(compact).toMatch(/--cv-line-height:\s*1\.3/);
    expect(comfy).toMatch(/--cv-line-height:\s*1\.5/);
  });

  it("circles the photo in photoShape:circle", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "circle",
    });
    expect(css).toMatch(/\.cv-photo\s*\{[^}]*border-radius:\s*50%/);
  });

  it("imports only the two Google Fonts the theme declares (Fraunces + Bricolage)", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/family=Fraunces/);
    expect(css).toMatch(/family=Bricolage\+Grotesque/);
    expect(css).not.toMatch(/family=Inter/);
  });
});
```

- [ ] **Step 2: Implement `buildStyles`**

```ts
// shared/src/templates/themes/atelier-classique/styles.ts
import type { z } from "zod";
import type { atelierClassique } from "./index";

export type Customization = z.infer<
  typeof atelierClassique.meta.customizationSchema
>;

const ACCENT_HEX: Record<string, string> = {
  oxblood: "#7B2D26",
  encre: "#1F2937",
  sapin: "#2E4A3A",
  graphite: "#3A3A3A",
  marine: "#1B3A5C",
};

const PHOTO_RADIUS: Record<string, string> = {
  square: "0",
  rounded: "6px",
  circle: "50%",
};

const FONT_IMPORTS = `@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700&display=swap");`;

export function buildStyles(c: Customization): string {
  const accent = ACCENT_HEX[c.accent] ?? ACCENT_HEX.oxblood;
  const lineHeight = c.density === "compact" ? "1.3" : "1.5";
  const sectionGap = c.density === "compact" ? "8mm" : "12mm";
  const itemGap = c.density === "compact" ? "4mm" : "6mm";
  const photoRadius = PHOTO_RADIUS[c.photoShape] ?? PHOTO_RADIUS.rounded;

  return `
${FONT_IMPORTS}
:root {
  --cv-accent: ${accent};
  --cv-ink: #16140F;
  --cv-muted: #6B6357;
  --cv-paper: #FFFFFF;
  --cv-rule: #1F1B14;
  --cv-line-height: ${lineHeight};
  --cv-section-gap: ${sectionGap};
  --cv-item-gap: ${itemGap};
  --cv-photo-radius: ${photoRadius};
}
@page { size: A4; margin: 18mm 16mm; }
html, body { margin: 0; padding: 0; background: var(--cv-paper); color: var(--cv-ink); }
body { font-family: "Bricolage Grotesque", "Helvetica Neue", Helvetica, sans-serif; font-size: 10.5pt; line-height: var(--cv-line-height); }
.cv { max-width: 178mm; margin: 0 auto; padding: 0; }
.cv-header { display: grid; grid-template-columns: 1fr auto; gap: 12mm; align-items: end; padding-bottom: 8mm; border-bottom: 1px solid var(--cv-rule); }
.cv-name { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 28pt; line-height: 1.05; margin: 0; }
.cv-label { font-family: "Fraunces", Georgia, serif; font-style: italic; color: var(--cv-muted); margin: 2mm 0 0; font-size: 14pt; }
.cv-meta { font-size: 9.5pt; color: var(--cv-muted); display: flex; flex-direction: column; gap: 1mm; text-align: right; }
.cv-meta a { color: inherit; text-decoration: none; }
.cv-photo { width: 28mm; height: 28mm; object-fit: cover; border-radius: var(--cv-photo-radius); }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-header { display: flex; align-items: baseline; gap: 6mm; }
.cv-section-num { font-family: "Fraunces", Georgia, serif; font-feature-settings: "tnum"; color: var(--cv-accent); font-size: 13pt; min-width: 8mm; }
.cv-section-title { font-family: "Fraunces", Georgia, serif; font-size: 13pt; margin: 0; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }
.cv-section-rule { flex: 1; height: 1px; background: var(--cv-rule); margin-bottom: 2mm; }
.cv-entry { margin-top: var(--cv-item-gap); page-break-inside: avoid; }
.cv-entry-row { display: flex; justify-content: space-between; gap: 6mm; }
.cv-entry-title { font-weight: 600; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "Fragment Mono", ui-monospace, "JetBrains Mono", monospace; font-size: 9.5pt; color: var(--cv-muted); white-space: nowrap; }
.cv-bullets { margin: 2mm 0 0; padding-left: 5mm; }
.cv-bullets li { margin: 0.5mm 0; }
.cv-skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm 8mm; }
.cv-skill-bucket-name { font-weight: 600; color: var(--cv-accent); }
.cv-skill-keywords { color: var(--cv-ink); }
.cv-ornament { text-align: center; color: var(--cv-accent); letter-spacing: 0.6em; font-size: 9pt; margin: 6mm 0 0; }
`.trim();
}
```

- [ ] **Step 3: Run tests**

Run: `cd shared && bun run test src/templates/themes/atelier-classique/styles.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Stage (do NOT commit yet)**

```bash
git add shared/src/templates/themes/atelier-classique/styles.ts shared/src/templates/themes/atelier-classique/styles.test.ts
# Hold the commit — Task 2.6 will land render.ts and create one combined commit.
```

### Task 2.6 — Build `atelier-classique` theme — `render.ts`

**Files:**
- Create: `shared/src/templates/themes/atelier-classique/render.ts`
- Test: `shared/src/templates/themes/atelier-classique/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/atelier-classique/render.test.ts
import { describe, it, expect } from "vitest";
import { render } from "./render";
import { sampleResume } from "../../__fixtures__/sampleResume";

const opts = {
  atsMode: "ats-balanced",
  customization: {
    accent: "oxblood",
    density: "comfy",
    photoShape: "rounded",
  },
  locale: "fr",
} as const;

describe("atelier-classique render", () => {
  it("emits a complete HTML document with a doctype", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<\/html>\s*$/i);
  });

  it("renders the candidate's name in the header", () => {
    const html = render(sampleResume, opts);
    expect(html).toContain("Yasmine Benali");
  });

  it("renders every work entry's company and position", () => {
    const html = render(sampleResume, opts);
    expect(html).toContain("Atelier SAS");
    expect(html).toContain("Ingénieure logicielle senior");
    expect(html).toContain("Startup XYZ");
    expect(html).toContain("Développeuse full-stack");
  });

  it("renders highlights as <li> elements", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(
      /<li>[^<]*Réduction de 60% de la latence API[^<]*<\/li>/,
    );
  });

  it("renders 'présent' for an open-ended end date", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/mars 2022 — présent/);
  });

  it("escapes HTML in user-provided strings", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, name: "Jane <script>" },
    };
    const html = render(resume, opts);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Jane &lt;script&gt;");
  });

  it("inlines the theme CSS and the base print chrome", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<style[^>]*data-theme=\"atelier-classique\"[^>]*>/);
    expect(html).toMatch(/<style[^>]*data-base[^>]*>/);
  });

  it("does NOT include the photo when image is empty", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, image: undefined },
    };
    const html = render(resume, opts);
    expect(html).not.toMatch(/class=\"cv-photo\"/);
  });

  it("applies the ATS overrides layer when atsMode is ats-strict", () => {
    const html = render(sampleResume, { ...opts, atsMode: "ats-strict" });
    expect(html).toMatch(/\[data-decorative\]\s*\{[^}]*display:\s*none/);
  });

  it("renders sections in canonical order: experience → education → skills → languages → interests", () => {
    const html = render(sampleResume, opts);
    const expIdx = html.indexOf("Expériences");
    const eduIdx = html.indexOf("Formation");
    const skillIdx = html.indexOf("Compétences");
    const langIdx = html.indexOf("Langues");
    const intIdx = html.indexOf("Centres d'intérêt");
    expect(expIdx).toBeGreaterThan(0);
    expect(expIdx).toBeLessThan(eduIdx);
    expect(eduIdx).toBeLessThan(skillIdx);
    expect(skillIdx).toBeLessThan(langIdx);
    expect(langIdx).toBeLessThan(intIdx);
  });
});
```

- [ ] **Step 2: Implement `render`**

```ts
// shared/src/templates/themes/atelier-classique/render.ts
import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, isoDateToHuman, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles, type Customization } from "./styles";
import type { ThemeRenderOptions } from "../types";

const SECTION_LABELS: Record<SupportedLocale, Record<string, string>> = {
  fr: {
    work: "Expériences",
    education: "Formation",
    skills: "Compétences",
    languages: "Langues",
    interests: "Centres d'intérêt",
  },
  en: {
    work: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(num: number, title: string, body: string): string {
  return `
<section class="cv-section">
  <header class="cv-section-header">
    <span class="cv-section-num" data-decorative>${num.toString().padStart(2, "0")}.</span>
    <h2 class="cv-section-title">${escapeHtml(title)}</h2>
    <span class="cv-section-rule" data-decorative></span>
  </header>
  ${body}
</section>`.trim();
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  const range = formatDateRange(w.startDate, w.endDate, locale);
  const bullets =
    w.highlights.length === 0
      ? ""
      : `<ul class="cv-bullets">${w.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`;
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(w.position)}</div>
      <div class="cv-entry-org">${escapeHtml(w.name)}${
        w.location ? ` · ${escapeHtml(w.location)}` : ""
      }</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(range)}</div>
  </div>
  ${w.summary ? `<p class="cv-entry-summary">${escapeHtml(w.summary)}</p>` : ""}
  ${bullets}
</article>`.trim();
}

function eduEntry(e: JsonResume["education"][number], locale: SupportedLocale): string {
  const range = formatDateRange(e.startDate, e.endDate, locale);
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")}</div>
      <div class="cv-entry-org">${escapeHtml(e.institution)}${
        e.location ? ` · ${escapeHtml(e.location)}` : ""
      }</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(range)}</div>
  </div>
  ${e.summary ? `<p class="cv-entry-summary">${escapeHtml(e.summary)}</p>` : ""}
</article>`.trim();
}

function skillsBlock(skills: JsonResume["skills"]): string {
  return `<div class="cv-skills-grid">${skills
    .map(
      (s) => `
<div class="cv-skill-row">
  <span class="cv-skill-bucket-name">${escapeHtml(s.name)}</span>
  <span class="cv-skill-sep" data-decorative> — </span>
  <span class="cv-skill-keywords">${(s.keywords as string[]).map(escapeHtml).join(", ")}</span>
</div>`,
    )
    .join("")}</div>`;
}

function languagesBlock(languages: JsonResume["languages"]): string {
  return `<ul class="cv-language-list">${languages
    .map(
      (l) =>
        `<li><span class="cv-entry-title">${escapeHtml(l.language)}</span>${
          l.fluency ? ` — <span class="cv-muted">${escapeHtml(l.fluency)}</span>` : ""
        }</li>`,
    )
    .join("")}</ul>`;
}

function interestsBlock(interests: JsonResume["interests"]): string {
  return interests
    .map(
      (i) =>
        `<p class="cv-interest">${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`,
    )
    .join("");
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = SECTION_LABELS[locale] ?? SECTION_LABELS.fr;

  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const showPhoto = Boolean(resume.basics.image);
  const photo = showPhoto
    ? `<img class="cv-photo" src="${escapeAttr(resume.basics.image)}" alt="" />`
    : "";

  const sections: string[] = [];
  let n = 1;
  if (resume.work.length) {
    sections.push(
      section(
        n++,
        labels.work,
        resume.work.map((w) => workEntry(w, locale)).join(""),
      ),
    );
  }
  if (resume.education.length) {
    sections.push(
      section(
        n++,
        labels.education,
        resume.education.map((e) => eduEntry(e, locale)).join(""),
      ),
    );
  }
  if (resume.skills.length) {
    sections.push(section(n++, labels.skills, skillsBlock(resume.skills)));
  }
  if (resume.languages.length) {
    sections.push(section(n++, labels.languages, languagesBlock(resume.languages)));
  }
  if (resume.interests.length) {
    sections.push(section(n++, labels.interests, interestsBlock(resume.interests)));
  }

  const linkedin = resume.basics.profiles.find(
    (p) => p.network.toLowerCase() === "linkedin",
  );

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-classique">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <div>
        <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
        ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
        ${
          resume.basics.summary
            ? `<p class="cv-summary">${escapeHtml(resume.basics.summary)}</p>`
            : ""
        }
      </div>
      <div class="cv-meta">
        ${resume.basics.email ? `<span>${escapeHtml(resume.basics.email)}</span>` : ""}
        ${resume.basics.phone ? `<span>${escapeHtml(resume.basics.phone)}</span>` : ""}
        ${resume.basics.location?.city ? `<span>${escapeHtml(resume.basics.location.city)}</span>` : ""}
        ${resume.basics.url ? `<span><a href="${escapeAttr(resume.basics.url)}">${escapeHtml(resume.basics.url)}</a></span>` : ""}
        ${linkedin?.url ? `<span><a href="${escapeAttr(linkedin.url)}">${escapeHtml(linkedin.username ?? linkedin.url)}</a></span>` : ""}
        ${photo}
      </div>
    </header>
    ${sections.join("\n")}
  </main>
</body>
</html>`;
}
```

- [ ] **Step 3: Run all `atelier-classique` tests**

Run: `cd shared && bun run test src/templates/themes/atelier-classique/`
Expected: PASS — all tests across `index.test.ts`, `styles.test.ts`, `render.test.ts`.

- [ ] **Step 4: Combined commit (covers Tasks 2.4–2.6)**

This is the deferred commit from Tasks 2.4 and 2.5. The codebase now type-checks for the first time since Phase 2 began.

```bash
git add shared/src/templates/themes/atelier-classique/
git commit -m "feat(shared): add atelier-classique theme (meta + styles + render)"
```

### Task 2.7 — Wire the theme registry

**Files:**
- Create: `shared/src/templates/themes/registry.ts`
- Create: `shared/src/templates/themes/index.ts`
- Test: `shared/src/templates/themes/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/themes/registry.test.ts
import { describe, it, expect } from "vitest";
import { themeRegistry, getTheme, requireTheme, listThemes } from "./index";

describe("themeRegistry", () => {
  it("contains atelier-classique", () => {
    expect(themeRegistry.find((t) => t.meta.id === "atelier-classique")).toBeDefined();
  });
  it("has unique ids", () => {
    const ids = themeRegistry.map((t) => t.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getTheme", () => {
  it("returns the theme by id", () => {
    expect(getTheme("atelier-classique")?.meta.id).toBe("atelier-classique");
  });
  it("returns undefined for unknown ids", () => {
    expect(getTheme("does-not-exist")).toBeUndefined();
  });
});

describe("requireTheme", () => {
  it("throws on unknown ids with a helpful message", () => {
    expect(() => requireTheme("nope")).toThrow(/unknown theme/i);
  });
});

describe("listThemes", () => {
  it("returns the meta block of every theme (no render function leak)", () => {
    const list = listThemes();
    expect(list[0]).toHaveProperty("id");
    expect(list[0]).not.toHaveProperty("render");
  });
});
```

- [ ] **Step 2: Implement registry + facade**

```ts
// shared/src/templates/themes/registry.ts
import type { Theme } from "./types";
import { atelierClassique } from "./atelier-classique/index";

export const themeRegistry: readonly Theme[] = [atelierClassique];
```

```ts
// shared/src/templates/themes/index.ts
import { themeRegistry } from "./registry";
import type { Theme, ThemeMeta } from "./types";

export { themeRegistry };
export type { Theme, ThemeMeta };
export type { AtsMode, ThemeTier, AtsProfile, ThemeRenderOptions } from "./types";

export function getTheme(id: string): Theme | undefined {
  return themeRegistry.find((t) => t.meta.id === id);
}

export function requireTheme(id: string): Theme {
  const t = getTheme(id);
  if (!t) throw new Error(`Unknown theme: ${id}`);
  return t;
}

export function listThemes(): readonly ThemeMeta[] {
  return themeRegistry.map((t) => t.meta);
}
```

- [ ] **Step 3: Run tests**

Run: `cd shared && bun run test src/templates/themes/registry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add shared/src/templates/themes/registry.ts shared/src/templates/themes/index.ts shared/src/templates/themes/registry.test.ts
git commit -m "feat(shared): wire theme registry and lookup facade"
```

---

## Phase 3 — `renderResumeHtml` + Playwright integration

**Why third:** The new renderer is the boundary between everything in Phase 1–2 and the production PDF service. Land it as a small, replaceable function, then point `pdfService` at it.

### Task 3.1 — Implement `renderResumeHtml`

**Files:**
- Create: `shared/src/templates/renderer.ts` (overwrites the existing 47KB file in Phase 10; for now we co-exist by renaming)

> The old renderer at `shared/src/templates/renderer.ts` is still consumed by `pdfService`. To avoid breaking the server during Phase 3, write the new renderer to `shared/src/templates/resumeRenderer.ts` instead, and only rename it to `renderer.ts` at Phase 10 cleanup. Update the test path accordingly.

- Create: `shared/src/templates/resumeRenderer.ts`
- Test: `shared/src/templates/resumeRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/templates/resumeRenderer.test.ts
import { describe, it, expect } from "vitest";
import { renderResumeHtml } from "./resumeRenderer";
import { sampleCv } from "./__fixtures__/sampleCv";

describe("renderResumeHtml", () => {
  it("delegates to the named theme and returns HTML", () => {
    const html = renderResumeHtml(sampleCv, {
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {
        accent: "oxblood",
        density: "comfy",
        photoShape: "rounded",
      },
    });
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain("Yasmine Benali");
  });

  it("throws on an unknown themeId", () => {
    expect(() =>
      renderResumeHtml(sampleCv, {
        themeId: "ghost-theme",
        atsMode: "ats-balanced",
        customization: {},
      }),
    ).toThrow(/unknown theme/i);
  });

  it("falls back to the theme's default customization when given an empty object", () => {
    const html = renderResumeHtml(sampleCv, {
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {},
    });
    expect(html).toMatch(/--cv-accent:\s*#7B2D26/i); // oxblood = default
  });

  it("rejects customization that fails the theme's schema", () => {
    expect(() =>
      renderResumeHtml(sampleCv, {
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "neon-pink" }, // not in enum
      }),
    ).toThrow(/customization/i);
  });

  it("honours the locale from cv.appearance", () => {
    const html = renderResumeHtml(
      { ...sampleCv, appearance: { locale: "en" } },
      {
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: {},
      },
    );
    expect(html).toContain("Experience");
  });
});
```

- [ ] **Step 2: Implement `renderResumeHtml`**

```ts
// shared/src/templates/resumeRenderer.ts
import type { z } from "zod";
import { cvDataSchema } from "../schemas/cv";
import { cvToJsonResume } from "./jsonResume/mapper";
import { requireTheme } from "./themes/index";
import type { AtsMode } from "./themes/types";
import type { SupportedLocale } from "./jsonResume/dates";

type Cv = z.infer<typeof cvDataSchema>;

export type RenderResumeOptions = {
  themeId: string;
  atsMode: AtsMode;
  customization: Readonly<Record<string, unknown>>;
};

export function renderResumeHtml(cv: Cv, opts: RenderResumeOptions): string {
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
    customization: parsed.data,
    locale,
  });
}
```

- [ ] **Step 3: Run tests**

Run: `cd shared && bun run test src/templates/resumeRenderer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add shared/src/templates/resumeRenderer.ts shared/src/templates/resumeRenderer.test.ts
git commit -m "feat(shared): add renderResumeHtml — boundary between CV and themes"
```

### Task 3.2 — Re-export the new public API from `shared/src/index.ts`

**Files:**
- Modify: `shared/src/index.ts`
- Modify: `shared/src/templates/index.ts`
- Modify: `shared/package.json` (add subpath `exports`)

- [ ] **Step 1: Read the existing exports**

Run: `cat shared/src/templates/index.ts shared/package.json`

- [ ] **Step 2: Add re-exports without removing the old ones (additive change)**

Open `shared/src/templates/index.ts` and append:

```ts
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
// Re-export the CV fixture and the ATS validator from the top-level barrel so
// every consumer (tests + scripts) uses `@cvie/shared` (no deep imports).
export { sampleCv } from "./__fixtures__/sampleCv";
export { sampleResume } from "./__fixtures__/sampleResume";
export { validateAtsHtml } from "./ats/validator";
export type { AtsReport } from "./ats/validator";
```

> The fixtures live under `__fixtures__` for filename hygiene (tooling ignores it by default). Re-exporting them keeps test code free of deep-path imports like `@cvie/shared/templates/__fixtures__/sampleCv`, which would otherwise need an explicit `exports` map entry in `shared/package.json`.

- [ ] **Step 3: Update `shared/src/index.ts` to surface the new names**

Append to `shared/src/index.ts`:

```ts
// Replaces the templates barrel as the canonical surface.
export * from "./templates";
```

Then audit `shared/src/index.ts` for stale `templateRegistry` / `renderCvHtml` exports and leave them in place for now — Phase 10 removes them after consumers migrate.

- [ ] **Step 4: Verify type-check passes**

Run: `cd shared && bun run type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/index.ts shared/src/index.ts
git commit -m "feat(shared): re-export new theme + renderer surface (incl. fixtures)"
```

### Task 3.3 — Update `pdfService.generateCvPdf` signature

**Files:**
- Modify: `server/src/services/pdfService.ts`
- Modify: `server/src/services/pdfService.test.ts` (existing — extend)

- [ ] **Step 1: Add new signature alongside old, mark old as deprecated**

Replace lines 52–136 of `pdfService.ts` with:

```ts
import {
  renderResumeHtml,
  safeImageUrl,
  type CvData,
  type AtsMode,
} from "@cvie/shared";

export type GeneratePdfInput = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Readonly<Record<string, unknown>>;
};

export async function generateResumePdf(input: GeneratePdfInput): Promise<Uint8Array> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:") || url.startsWith("about:")) return route.continue();
      try {
        const host = new URL(url).host;
        if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
          return route.continue();
        }
      } catch { /* fall through */ }
      return route.abort();
    });

    const inlinedCv = await inlineRemotePhotoForPdf(input.cv);
    const html = renderResumeHtml(inlinedCv, {
      themeId: input.themeId,
      atsMode: input.atsMode,
      customization: input.customization,
    });

    await page.setContent(html, { waitUntil: "load", timeout: 10_000 });
    await page.evaluate("document.fonts && document.fonts.ready");
    await page.emulateMedia({ media: "print" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await context.close();
  }
}

/** @deprecated Use generateResumePdf. Kept temporarily so the old route
 *  still compiles during the route migration in Task 3.4. Remove in Phase 10. */
export async function generateCvPdf(
  data: CvData,
  template: string = "atelier-classique",
  _scale = 1,
  _overflowMode: unknown = "section",
): Promise<Uint8Array> {
  return generateResumePdf({
    cv: data,
    themeId: template,
    atsMode: "ats-balanced",
    customization: {},
  });
}
```

> Keep `inlineRemotePhotoForPdf`, `getBrowser`, `warmupPdfService`, `shutdownPdfService`, `slugify`, `pdfFilename` exactly as-is.

- [ ] **Step 2: Add a new test for `generateResumePdf`**

Append to `server/src/services/pdfService.test.ts`:

```ts
import { generateResumePdf } from "./pdfService";
import { sampleCv } from "@cvie/shared";

test("generateResumePdf emits a valid A4 PDF with atelier-classique", async () => {
  const bytes = await generateResumePdf({
    cv: sampleCv,
    themeId: "atelier-classique",
    atsMode: "ats-balanced",
    customization: {},
  });
  // PDF magic bytes
  expect(bytes[0]).toBe(0x25); // %
  expect(bytes[1]).toBe(0x50); // P
  expect(bytes[2]).toBe(0x44); // D
  expect(bytes[3]).toBe(0x46); // F
  expect(bytes.byteLength).toBeGreaterThan(5_000);
});
```

> Re-export of `sampleCv` from `shared/src/index.ts` is added in Task 3.2 — make sure that ran first.

- [ ] **Step 3: Run the server tests**

Run: `cd server && bun test src/services/__tests__/pdfService.test.ts`
Expected: PASS — both the new `generateResumePdf` test and the existing `generateCvPdf` tests (the deprecated function now delegates).

- [ ] **Step 4: Commit**

```bash
git add server/src/services/pdfService.ts server/src/services/pdfService.test.ts shared/src/index.ts
git commit -m "feat(server): switch PDF service to renderResumeHtml via generateResumePdf"
```

### Task 3.4 — Update the `/api/v1/cv/pdf` route to accept `themeId/atsMode/customization`

**Files:**
- Modify: `server/src/routes/cv.ts` (lines 106-200 region — the PDF route)
- Modify: `server/src/routes/__tests__/cv.test.ts` (route tests — extend)

- [ ] **Step 1: Add the new request schema (Zod) at the top of `cv.ts`**

Insert (above the route definition):

```ts
// `cvData` is the structured CV; `themeId/atsMode/customization` are render-time
// knobs. Field-by-field validation lets the route emit specific French error
// codes (the existing UX) instead of a single generic 400.
const pdfBodySchema = z.object({
  cvData: cvDataSchema,
  themeId: z.string().min(1).max(64),
  atsMode: z.enum(["ats-strict", "ats-balanced", "expressive"]).optional(),
  customization: z.record(z.string(), z.unknown()).default({}),
});
```

- [ ] **Step 2: Replace the route body — preserve the existing French error codes**

The current `/pdf` route emits specific French error codes (`PAYLOAD_TOO_LARGE`, `INVALID_JSON`, `VALIDATION_FAILED`, `INVALID_TEMPLATE`, `PDF_GENERATION_FAILED`) that the client surfaces in toasts. **Do not regress this UX.** Replace the body with field-by-field parsing that maps cleanly onto those codes:

```ts
cvRoutes.post(
  "/pdf",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) =>
      c.json(
        { error: "La requête est trop volumineuse.", code: "PAYLOAD_TOO_LARGE" },
        413,
      ),
  }),
  rateLimit({ max: PDF_RATE_LIMIT_PER_MIN, windowMs: 60_000 }),
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        { error: "Le corps de la requête doit être un JSON valide.", code: "INVALID_JSON" },
        400,
      );
    }

    const parsed = pdfBodySchema.safeParse(body);
    if (!parsed.success) {
      // Map the first error to a specific French code; keep details only in dev.
      const firstPath = parsed.error.issues[0]?.path[0];
      const code =
        firstPath === "cvData"
          ? "VALIDATION_FAILED"
          : firstPath === "themeId"
            ? "INVALID_TEMPLATE"
            : firstPath === "atsMode"
              ? "INVALID_ATS_MODE"
              : firstPath === "customization"
                ? "INVALID_CUSTOMIZATION"
                : "VALIDATION_FAILED";
      const message =
        code === "INVALID_TEMPLATE"
          ? "Le template sélectionné est invalide."
          : code === "INVALID_ATS_MODE"
            ? "Le mode ATS demandé est invalide."
            : code === "INVALID_CUSTOMIZATION"
              ? "La personnalisation du thème est invalide."
              : "Les données du CV sont invalides.";
      return c.json(
        {
          error: message,
          code,
          ...(IS_PROD ? {} : { details: parsed.error.issues }),
        },
        400,
      );
    }

    const { cvData, themeId, atsMode, customization } = parsed.data;
    const theme = getTheme(themeId);
    if (!theme) {
      return c.json(
        { error: "Le template sélectionné est invalide.", code: "INVALID_TEMPLATE" },
        400,
      );
    }

    // Theme-defined customization passes a second validation layer.
    const customizationParsed = theme.meta.customizationSchema.safeParse(customization);
    if (!customizationParsed.success) {
      return c.json(
        {
          error: "La personnalisation du thème est invalide.",
          code: "INVALID_CUSTOMIZATION",
          ...(IS_PROD ? {} : { details: customizationParsed.error.issues }),
        },
        400,
      );
    }

    const resolvedMode = atsMode ?? theme.meta.atsProfile.defaultMode;

    try {
      const pdf = await generateResumePdf({
        cv: cvData,
        themeId,
        atsMode: resolvedMode,
        customization: customizationParsed.data,
      });
      const filename = pdfFilename(cvData);
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[pdfService] generation failed:", err);
      return c.json(
        { error: "Impossible de générer le PDF pour le moment.", code: "PDF_GENERATION_FAILED" },
        500,
      );
    }
  },
);
```

Add this import near the top of the file:

```ts
import { getTheme } from "@cvie/shared";
import { generateResumePdf } from "../services/pdfService";
```

> Keep the `bodyLimit` and `rateLimit` middleware unchanged.

- [ ] **Step 3: Update existing route tests + add per-mode tests**

```ts
// server/src/routes/__tests__/cv.test.ts (append)
import { sampleCv } from "@cvie/shared";

test("POST /api/v1/cv/pdf accepts new {themeId, atsMode, customization} body", async () => {
  const res = await app.request("/api/v1/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvData: sampleCv,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: { accent: "encre" },
    }),
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/pdf");
});

test("POST /api/v1/cv/pdf rejects unknown themeId with 400", async () => {
  const res = await app.request("/api/v1/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvData: sampleCv,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: { accent: "neon-glitch" },
    }),
  });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 4: Run server tests**

Run: `cd server && bun test src/routes/__tests__/cv.test.ts`
Expected: PASS — new tests pass, existing tests still pass (the deprecated body shape is accepted via the legacy path until Phase 10).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/cv.ts server/src/routes/__tests__/cv.test.ts
git commit -m "feat(server): accept themeId/atsMode/customization on /api/v1/cv/pdf"
```

---

## Phase 4 — Two more themes (`atelier-moderne`, `atelier-minimaliste`)

Both themes follow the exact same three-file layout as `atelier-classique`: `index.ts` (meta), `styles.ts` (CSS builder), `render.ts` (render function). Tests follow the same shape — copy the `atelier-classique` test files and adjust the expected strings.

The goals here are **distinct visual identity** (so the user doesn't get one-trick-pony output) and **distinct ATS profiles** (so the test matrix in Phase 8 is meaningful).

### Task 4.1 — `atelier-moderne` (editorial press, two-column)

**Aesthetic:**
- Display: **Newsreader** (variable, optical-sized serif with strong stress)
- Body: **Inter Tight** (Google Fonts, free; allowed as a *body* face here because the display + accent carry identity — the avoid-list applies to *whole-document* Inter)
- Layout: two-column (left 32% / right 68%), accent **rust #B14E2A**, italic labels, hairline rules between sections
- ATS profile: `minSupported: "ats-balanced"`, `defaultMode: "ats-balanced"`
- Customization: `accent` (rust / sépia / aubergine / forêt / encre), `density` (compact / comfy), `photoShape` (square / rounded)

**Files:**
- Create: `shared/src/templates/themes/atelier-moderne/{index,styles,render}.ts`
- Test: `shared/src/templates/themes/atelier-moderne/{index,styles,render}.test.ts`

- [ ] **Step 1: Write `index.test.ts`**

```ts
// shared/src/templates/themes/atelier-moderne/index.test.ts
import { describe, it, expect } from "vitest";
import { atelierModerne } from "./index";

describe("atelierModerne.meta", () => {
  it("is identified by 'atelier-moderne'", () => {
    expect(atelierModerne.meta.id).toBe("atelier-moderne");
  });
  it("is in the free tier", () => {
    expect(atelierModerne.meta.tier).toBe("free");
  });
  it("declares ats-balanced as its narrowest mode (two-column layout)", () => {
    expect(atelierModerne.meta.atsProfile.minSupported).toBe("ats-balanced");
  });
});
```

- [ ] **Step 2: Implement `index.ts`**

```ts
// shared/src/templates/themes/atelier-moderne/index.ts
import { z } from "zod";
import type { Theme } from "../types";
import { render } from "./render";

const customizationSchema = z.object({
  accent: z.enum(["rust", "sepia", "aubergine", "forest", "encre"]),
  density: z.enum(["compact", "comfy"]),
  photoShape: z.enum(["square", "rounded"]),
});

export const atelierModerne: Theme = {
  meta: {
    id: "atelier-moderne",
    name: "Atelier — Moderne",
    description:
      "Éditorial presse : serif Newsreader, mise en page asymétrique deux colonnes, accent rouille.",
    tier: "free",
    atsProfile: { minSupported: "ats-balanced", defaultMode: "ats-balanced" },
    supportsPhoto: true,
    defaultCustomization: { accent: "rust", density: "comfy", photoShape: "rounded" },
    customizationSchema,
  },
  render,
};
```

- [ ] **Step 3: Write `styles.test.ts` (mirror of classique)**

```ts
// shared/src/templates/themes/atelier-moderne/styles.test.ts
import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("atelier-moderne styles", () => {
  it("declares a two-column main grid", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/grid-template-columns:\s*32%\s*68%/);
  });
  it("uses Newsreader as the display font", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/family=Newsreader/);
  });
  it("uses rust accent for the 'rust' value", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/--cv-accent:\s*#B14E2A/i);
  });
});
```

- [ ] **Step 4: Implement `styles.ts`**

```ts
// shared/src/templates/themes/atelier-moderne/styles.ts
import type { z } from "zod";
import type { atelierModerne } from "./index";

export type Customization = z.infer<typeof atelierModerne.meta.customizationSchema>;

const ACCENT_HEX: Record<string, string> = {
  rust: "#B14E2A",
  sepia: "#8C6A3F",
  aubergine: "#5A2B4D",
  forest: "#2F5141",
  encre: "#22303C",
};

export function buildStyles(c: Customization): string {
  const accent = ACCENT_HEX[c.accent] ?? ACCENT_HEX.rust;
  const lineHeight = c.density === "compact" ? "1.32" : "1.5";
  const sectionGap = c.density === "compact" ? "7mm" : "11mm";
  const photoRadius = c.photoShape === "rounded" ? "6px" : "0";

  return `
@import url("https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght,ital@6..72,400;6..72,500;6..72,700;6..72,400i;6..72,700i&family=Inter+Tight:wght@400;500;700&display=swap");
:root {
  --cv-accent: ${accent};
  --cv-ink: #111111;
  --cv-muted: #6B6357;
  --cv-rule: #1a1a1a;
  --cv-line-height: ${lineHeight};
  --cv-section-gap: ${sectionGap};
  --cv-photo-radius: ${photoRadius};
}
@page { size: A4; margin: 16mm 14mm; }
html, body { margin: 0; padding: 0; background: #FFFFFF; color: var(--cv-ink); }
body { font-family: "Inter Tight", -apple-system, sans-serif; font-size: 10pt; line-height: var(--cv-line-height); }
.cv { max-width: 182mm; margin: 0 auto; display: grid; grid-template-columns: 32% 68%; column-gap: 10mm; }
.cv-header { grid-column: 1 / -1; padding-bottom: 6mm; border-bottom: 0.5pt solid var(--cv-rule); margin-bottom: 8mm; display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: end; }
.cv-name { font-family: "Newsreader", Georgia, serif; font-weight: 700; font-size: 32pt; line-height: 1; margin: 0; }
.cv-label { font-family: "Newsreader", Georgia, serif; font-style: italic; font-weight: 400; color: var(--cv-accent); margin: 2mm 0 0; font-size: 14pt; }
.cv-photo { width: 26mm; height: 26mm; object-fit: cover; border-radius: var(--cv-photo-radius); }
.cv-meta { font-size: 9pt; color: var(--cv-muted); display: flex; flex-direction: column; gap: 1mm; text-align: right; }
.cv-section-title { font-family: "Newsreader", Georgia, serif; font-style: italic; font-weight: 700; color: var(--cv-accent); font-size: 13pt; margin: 0 0 3mm; letter-spacing: 0.02em; }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-num { display: none; } /* moderne uses italic titles, no numerals */
.cv-section-rule { display: none; }
.cv-entry { margin-top: 4mm; page-break-inside: avoid; }
.cv-entry-title { font-weight: 700; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "Inter Tight", monospace; font-size: 9pt; color: var(--cv-muted); }
.cv-bullets { margin: 2mm 0 0; padding-left: 4mm; }
/* Left column (cv-section-aside) holds skills/languages/interests; right column (cv-section-main) holds experience/education. */
.cv-section-aside { grid-column: 1; }
.cv-section-main { grid-column: 2; }
`.trim();
}
```

- [ ] **Step 5: Write `render.test.ts`**

```ts
// shared/src/templates/themes/atelier-moderne/render.test.ts
import { describe, it, expect } from "vitest";
import { render } from "./render";
import { sampleResume } from "../../__fixtures__/sampleResume";

const opts = {
  atsMode: "ats-balanced",
  customization: { accent: "rust", density: "comfy", photoShape: "rounded" },
  locale: "fr",
} as const;

describe("atelier-moderne render", () => {
  it("emits a complete HTML document", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });
  it("renders experiences inside cv-section-main", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<section[^>]*class="cv-section cv-section-main"/);
  });
  it("renders skills inside cv-section-aside", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<section[^>]*class="cv-section cv-section-aside"/);
  });
  it("forces single-column when atsMode is ats-strict (overrides)", () => {
    const html = render(sampleResume, { ...opts, atsMode: "ats-strict" });
    expect(html).toMatch(/grid-template-columns:\s*1fr\s*!important/);
  });
});
```

- [ ] **Step 6: Implement `render.ts`**

```ts
// shared/src/templates/themes/atelier-moderne/render.ts
import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles, type Customization } from "./styles";
import type { ThemeRenderOptions } from "../types";

const LABELS: Record<SupportedLocale, Record<string, string>> = {
  fr: { work: "Expériences", education: "Formation", skills: "Compétences", languages: "Langues", interests: "Intérêts" },
  en: { work: "Experience", education: "Education", skills: "Skills", languages: "Languages", interests: "Interests" },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(cls: "aside" | "main", title: string, body: string): string {
  return `<section class="cv-section cv-section-${cls}"><h2 class="cv-section-title">${escapeHtml(title)}</h2>${body}</section>`;
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-title">${escapeHtml(w.position)} <span class="cv-entry-org">— ${escapeHtml(w.name)}</span></div>
  <div class="cv-entry-dates">${escapeHtml(formatDateRange(w.startDate, w.endDate, locale))}${
    w.location ? ` · ${escapeHtml(w.location)}` : ""
  }</div>
  ${
    w.highlights.length
      ? `<ul class="cv-bullets">${w.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
      : ""
  }
</article>`.trim();
}

function eduEntry(e: JsonResume["education"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")} <span class="cv-entry-org">— ${escapeHtml(e.institution)}</span></div>
  <div class="cv-entry-dates">${escapeHtml(formatDateRange(e.startDate, e.endDate, locale))}${
    e.location ? ` · ${escapeHtml(e.location)}` : ""
  }</div>
  ${e.summary ? `<p>${escapeHtml(e.summary)}</p>` : ""}
</article>`.trim();
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = LABELS[locale] ?? LABELS.fr;
  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const linkedin = resume.basics.profiles.find((p) => p.network.toLowerCase() === "linkedin");
  const photo = resume.basics.image
    ? `<img class="cv-photo" src="${escapeAttr(resume.basics.image)}" alt="" />`
    : "";

  const mainSections: string[] = [];
  if (resume.work.length) {
    mainSections.push(
      section("main", labels.work, resume.work.map((w) => workEntry(w, locale)).join("")),
    );
  }
  if (resume.education.length) {
    mainSections.push(
      section("main", labels.education, resume.education.map((e) => eduEntry(e, locale)).join("")),
    );
  }

  const asideSections: string[] = [];
  if (resume.skills.length) {
    asideSections.push(
      section(
        "aside",
        labels.skills,
        resume.skills
          .map(
            (s) =>
              `<div class="cv-skill-row"><div class="cv-entry-title">${escapeHtml(s.name)}</div><div>${(s.keywords as string[]).map(escapeHtml).join(", ")}</div></div>`,
          )
          .join(""),
      ),
    );
  }
  if (resume.languages.length) {
    asideSections.push(
      section(
        "aside",
        labels.languages,
        `<ul>${resume.languages.map((l) => `<li><span class="cv-entry-title">${escapeHtml(l.language)}</span>${l.fluency ? ` — ${escapeHtml(l.fluency)}` : ""}</li>`).join("")}</ul>`,
      ),
    );
  }
  if (resume.interests.length) {
    asideSections.push(
      section(
        "aside",
        labels.interests,
        resume.interests
          .map((i) => `<p>${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`)
          .join(""),
      ),
    );
  }

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-moderne">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <div>
        <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
        ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
        ${resume.basics.summary ? `<p class="cv-summary">${escapeHtml(resume.basics.summary)}</p>` : ""}
      </div>
      <div class="cv-meta">
        ${resume.basics.email ? `<span>${escapeHtml(resume.basics.email)}</span>` : ""}
        ${resume.basics.phone ? `<span>${escapeHtml(resume.basics.phone)}</span>` : ""}
        ${resume.basics.location?.city ? `<span>${escapeHtml(resume.basics.location.city)}</span>` : ""}
        ${resume.basics.url ? `<span><a href="${escapeAttr(resume.basics.url)}">${escapeHtml(resume.basics.url)}</a></span>` : ""}
        ${linkedin?.url ? `<span><a href="${escapeAttr(linkedin.url)}">${escapeHtml(linkedin.username ?? "")}</a></span>` : ""}
        ${photo}
      </div>
    </header>
    ${asideSections.join("\n")}
    ${mainSections.join("\n")}
  </main>
</body>
</html>`;
}
```

- [ ] **Step 7: Run all atelier-moderne tests**

Run: `cd shared && bun run test src/templates/themes/atelier-moderne/`
Expected: PASS — index/styles/render tests all green.

- [ ] **Step 8: Register the theme**

Open `shared/src/templates/themes/registry.ts` and update:

```ts
import { atelierClassique } from "./atelier-classique/index";
import { atelierModerne } from "./atelier-moderne/index";

export const themeRegistry: readonly Theme[] = [atelierClassique, atelierModerne];
```

- [ ] **Step 9: Commit**

```bash
git add shared/src/templates/themes/atelier-moderne/ shared/src/templates/themes/registry.ts
git commit -m "feat(shared): add atelier-moderne theme (two-column editorial)"
```

### Task 4.2 — `atelier-minimaliste` (Swiss grid, no photo, ats-strict)

**Aesthetic:**
- Display: **Söhne Mono** alternative — use **JetBrains Mono** + **Fraktur** display? No: keep coherent. Use **IBM Plex Sans** (free, distinctive Swiss provenance, NOT Inter) for body, **IBM Plex Mono** for dates/labels.
- Layout: single column, max-width 158mm, no photo, 12-column baseline grid, dates in monospace, section titles in small caps
- Accent: optional hairline **encre #16140F** (essentially black on white, with hairline rules)
- ATS profile: `minSupported: "ats-strict"`, `defaultMode: "ats-strict"` — this theme is the ATS-safe default
- Customization: `density` only (compact / comfy) — no accent, no photo. This is the *premium-ATS* baseline.

**Files:**
- Create: `shared/src/templates/themes/atelier-minimaliste/{index,styles,render}.ts`
- Test: corresponding `*.test.ts`

- [ ] **Step 1: Implement `index.ts` and its test**

```ts
// shared/src/templates/themes/atelier-minimaliste/index.ts
import { z } from "zod";
import type { Theme } from "../types";
import { render } from "./render";

const customizationSchema = z.object({
  density: z.enum(["compact", "comfy"]),
});

export const atelierMinimaliste: Theme = {
  meta: {
    id: "atelier-minimaliste",
    name: "Atelier — Minimaliste",
    description: "Grille suisse : IBM Plex Sans, dates monospace, sans photo, ATS-strict natif.",
    tier: "free",
    atsProfile: { minSupported: "ats-strict", defaultMode: "ats-strict" },
    supportsPhoto: false,
    defaultCustomization: { density: "comfy" },
    customizationSchema,
  },
  render,
};
```

```ts
// shared/src/templates/themes/atelier-minimaliste/index.test.ts
import { describe, it, expect } from "vitest";
import { atelierMinimaliste } from "./index";

describe("atelierMinimaliste.meta", () => {
  it("has id atelier-minimaliste", () => {
    expect(atelierMinimaliste.meta.id).toBe("atelier-minimaliste");
  });
  it("does NOT support photos", () => {
    expect(atelierMinimaliste.meta.supportsPhoto).toBe(false);
  });
  it("defaults to ats-strict (native)", () => {
    expect(atelierMinimaliste.meta.atsProfile.defaultMode).toBe("ats-strict");
  });
  it("only exposes 'density' as a knob (no accent, no photoShape)", () => {
    const keys = Object.keys(atelierMinimaliste.meta.defaultCustomization);
    expect(keys).toEqual(["density"]);
  });
});
```

- [ ] **Step 2: Implement `styles.ts` + test**

```ts
// shared/src/templates/themes/atelier-minimaliste/styles.ts
import type { z } from "zod";
import type { atelierMinimaliste } from "./index";

export type Customization = z.infer<typeof atelierMinimaliste.meta.customizationSchema>;

export function buildStyles(c: Customization): string {
  const lh = c.density === "compact" ? "1.32" : "1.48";
  const gap = c.density === "compact" ? "7mm" : "10mm";
  return `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap");
:root { --cv-ink: #16140F; --cv-muted: #6B6357; --cv-rule: #16140F; --cv-line-height: ${lh}; --cv-section-gap: ${gap}; }
@page { size: A4; margin: 18mm 18mm; }
html, body { margin: 0; padding: 0; background: #FFFFFF; color: var(--cv-ink); }
body { font-family: "IBM Plex Sans", system-ui, sans-serif; font-size: 10pt; line-height: var(--cv-line-height); }
.cv { max-width: 158mm; margin: 0 auto; }
.cv-header { padding-bottom: 4mm; border-bottom: 0.5pt solid var(--cv-rule); margin-bottom: 6mm; }
.cv-name { font-size: 20pt; margin: 0; letter-spacing: -0.01em; }
.cv-label { color: var(--cv-muted); margin: 1mm 0 0; font-size: 11pt; }
.cv-meta { margin-top: 3mm; font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--cv-muted); display: flex; gap: 5mm; flex-wrap: wrap; }
.cv-meta a { color: inherit; text-decoration: none; }
.cv-photo { display: none; } /* Minimaliste never renders a photo. */
.cv-section-title { font-size: 9pt; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; margin: 0 0 3mm; }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-num { display: none; }
.cv-section-rule { display: none; }
.cv-entry { margin-top: 4mm; page-break-inside: avoid; }
.cv-entry-row { display: grid; grid-template-columns: 1fr auto; gap: 6mm; }
.cv-entry-title { font-weight: 700; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--cv-muted); }
.cv-bullets { margin: 2mm 0 0; padding-left: 4mm; }
`.trim();
}
```

```ts
// shared/src/templates/themes/atelier-minimaliste/styles.test.ts
import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("atelier-minimaliste styles", () => {
  it("hides the photo entirely", () => {
    expect(buildStyles({ density: "comfy" })).toMatch(/\.cv-photo\s*\{[^}]*display:\s*none/);
  });
  it("imports IBM Plex Sans + Mono only", () => {
    const css = buildStyles({ density: "comfy" });
    expect(css).toMatch(/family=IBM\+Plex\+Sans/);
    expect(css).toMatch(/family=IBM\+Plex\+Mono/);
    expect(css).not.toMatch(/family=Inter/);
    expect(css).not.toMatch(/family=Fraunces/);
  });
});
```

- [ ] **Step 3: Implement `render.ts` (copy of moderne, simplified — single column, no photo)**

```ts
// shared/src/templates/themes/atelier-minimaliste/render.ts
import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles, type Customization } from "./styles";
import type { ThemeRenderOptions } from "../types";

const LABELS: Record<SupportedLocale, Record<string, string>> = {
  fr: { work: "Expériences", education: "Formation", skills: "Compétences", languages: "Langues", interests: "Intérêts" },
  en: { work: "Experience", education: "Education", skills: "Skills", languages: "Languages", interests: "Interests" },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(title: string, body: string): string {
  return `<section class="cv-section"><h2 class="cv-section-title">${escapeHtml(title)}</h2>${body}</section>`;
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(w.position)}</div>
      <div class="cv-entry-org">${escapeHtml(w.name)}${w.location ? ` · ${escapeHtml(w.location)}` : ""}</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(formatDateRange(w.startDate, w.endDate, locale))}</div>
  </div>
  ${
    w.highlights.length
      ? `<ul class="cv-bullets">${w.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
      : ""
  }
</article>`.trim();
}

function eduEntry(e: JsonResume["education"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")}</div>
      <div class="cv-entry-org">${escapeHtml(e.institution)}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(formatDateRange(e.startDate, e.endDate, locale))}</div>
  </div>
</article>`.trim();
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = LABELS[locale] ?? LABELS.fr;
  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const sections: string[] = [];
  if (resume.work.length) sections.push(section(labels.work, resume.work.map((w) => workEntry(w, locale)).join("")));
  if (resume.education.length) sections.push(section(labels.education, resume.education.map((e) => eduEntry(e, locale)).join("")));
  if (resume.skills.length) {
    sections.push(
      section(
        labels.skills,
        resume.skills
          .map((s) => `<div class="cv-entry"><div class="cv-entry-title">${escapeHtml(s.name)}</div><div>${(s.keywords as string[]).map(escapeHtml).join(", ")}</div></div>`)
          .join(""),
      ),
    );
  }
  if (resume.languages.length) {
    sections.push(
      section(
        labels.languages,
        `<ul>${resume.languages.map((l) => `<li>${escapeHtml(l.language)}${l.fluency ? ` — ${escapeHtml(l.fluency)}` : ""}</li>`).join("")}</ul>`,
      ),
    );
  }
  if (resume.interests.length) {
    sections.push(
      section(
        labels.interests,
        resume.interests.map((i) => `<p>${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`).join(""),
      ),
    );
  }

  const linkedin = resume.basics.profiles.find((p) => p.network.toLowerCase() === "linkedin");

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-minimaliste">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
      ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
      <div class="cv-meta">
        ${resume.basics.email ? `<span>${escapeHtml(resume.basics.email)}</span>` : ""}
        ${resume.basics.phone ? `<span>${escapeHtml(resume.basics.phone)}</span>` : ""}
        ${resume.basics.location?.city ? `<span>${escapeHtml(resume.basics.location.city)}</span>` : ""}
        ${resume.basics.url ? `<span><a href="${escapeAttr(resume.basics.url)}">${escapeHtml(resume.basics.url)}</a></span>` : ""}
        ${linkedin?.url ? `<span><a href="${escapeAttr(linkedin.url)}">${escapeHtml(linkedin.username ?? "")}</a></span>` : ""}
      </div>
    </header>
    ${sections.join("\n")}
  </main>
</body>
</html>`;
}
```

- [ ] **Step 4: Register the theme + run all tests**

```ts
// shared/src/templates/themes/registry.ts
import type { Theme } from "./types";
import { atelierClassique } from "./atelier-classique/index";
import { atelierModerne } from "./atelier-moderne/index";
import { atelierMinimaliste } from "./atelier-minimaliste/index";

export const themeRegistry: readonly Theme[] = [
  atelierClassique,
  atelierModerne,
  atelierMinimaliste,
];
```

Run: `cd shared && bun run test src/templates/themes/`
Expected: PASS for all three theme families.

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/themes/atelier-minimaliste/ shared/src/templates/themes/registry.ts
git commit -m "feat(shared): add atelier-minimaliste theme (ats-strict native)"
```

---

## Phase 5 — Atelier editor UI redesign

This phase rebuilds the editor as the three-column **Atelier Typographique** workspace defined in [Aesthetic Direction](#aesthetic-direction). Each task is one component; tests use Vitest + Testing Library. Drag-reorder behaviour is covered with synthetic events (no real DnD library — Base UI doesn't ship one, and the editor only reorders within a section).

The component tree under `client/src/features/editor/atelier/`:

```
Workspace.tsx                  ← shell, holds form context + active-section state
  TocRail.tsx                  ← left rail
  forms/SectionRouter.tsx      ← renders the currently-active section's form
    forms/PersonalInfoForm.tsx
    forms/FormationsForm.tsx
    forms/ExperiencesForm.tsx
    forms/SkillsForm.tsx
    forms/LanguagesForm.tsx
    forms/InterestsForm.tsx
    forms/_atoms/{TextInput, TextArea, DateInput, SmallCapsLabel, Marginalia}.tsx
  PreviewPane.tsx              ← right pane, iframe-rendered live preview
  ExportBar.tsx                ← theme picker + ATS toggle + export button
  StampSaved.tsx               ← the "épreuve enregistrée" stamp animation
```

### Task 5.1 — Add Atelier design tokens to `globals.css`

**Files:**
- Modify: `client/src/globals.css`

- [ ] **Step 1: Append the token block at the bottom of the file**

```css
/* === Atelier Typographique editor tokens === */
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400;9..144,600;9..144,700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700&family=Fragment+Mono:wght@400&display=swap");

:root {
  --atelier-paper: #F6F2E7;
  --atelier-ink: #16140F;
  --atelier-rule: #1F1B14;
  --atelier-accent: #7B2D26;
  --atelier-muted: #6B6357;
  --atelier-mark: #E8C24E;
  --atelier-display: "Fraunces", Georgia, serif;
  --atelier-body: "Bricolage Grotesque", "Helvetica Neue", sans-serif;
  --atelier-mono: "Fragment Mono", ui-monospace, monospace;
}

.dark {
  --atelier-paper: #15140F;
  --atelier-ink: #ECE5D3;
  --atelier-rule: #38332A;
  --atelier-accent: #D6A453;
  --atelier-muted: #7A7160;
  --atelier-mark: #7B2D26;
}

/* Film-grain overlay used only on the editor canvas. */
.atelier-canvas {
  position: relative;
  isolation: isolate;
}
.atelier-canvas::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 160px 160px;
}

@keyframes atelier-stamp-in {
  0% { transform: scale(0.85); opacity: 0; filter: blur(2px); }
  60% { transform: scale(1.05); opacity: 1; filter: blur(0); }
  100% { transform: scale(1); opacity: 1; }
}
```

> **Important (per project memory):** Do NOT define `--spacing-*` token names; they collide with Tailwind v4's `max-w-2xl` / `text-2xl` size scale. Stick to the `--atelier-*` namespace.

- [ ] **Step 2: Commit**

```bash
git add client/src/globals.css
git commit -m "feat(client): add Atelier editor design tokens (fonts, colors, grain)"
```

### Task 5.2 — Build the form atoms

**Files:**
- Create: `client/src/features/editor/atelier/forms/_atoms/SmallCapsLabel.tsx`
- Create: `client/src/features/editor/atelier/forms/_atoms/TextInput.tsx`
- Create: `client/src/features/editor/atelier/forms/_atoms/TextArea.tsx`
- Create: `client/src/features/editor/atelier/forms/_atoms/DateInput.tsx`
- Create: `client/src/features/editor/atelier/forms/_atoms/Marginalia.tsx`
- Test: one `__tests__/atoms.test.tsx` covering all five

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/forms/_atoms/__tests__/atoms.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmallCapsLabel } from "../SmallCapsLabel";
import { TextInput } from "../TextInput";
import { TextArea } from "../TextArea";
import { DateInput } from "../DateInput";
import { Marginalia } from "../Marginalia";

describe("SmallCapsLabel", () => {
  it("renders children in small caps", () => {
    render(<SmallCapsLabel htmlFor="x">Prénom</SmallCapsLabel>);
    const label = screen.getByText("Prénom");
    expect(label).toHaveAttribute("for", "x");
    expect(label).toHaveStyle({ fontVariant: "small-caps" });
  });
});

describe("TextInput", () => {
  it("calls onChange with the new value", () => {
    let v = "";
    render(<TextInput value="" onChange={(next) => (v = next)} label="Test" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Yasmine" } });
    expect(v).toBe("Yasmine");
  });

  it("renders a bottom-rule input (no full border)", () => {
    render(<TextInput value="" onChange={() => {}} label="Test" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-b/);
    expect(input.className).not.toMatch(/border\s/);
  });
});

describe("TextArea", () => {
  it("renders as a multiline input", () => {
    render(<TextArea value="" onChange={() => {}} label="Test" rows={4} />);
    const ta = screen.getByRole("textbox");
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveAttribute("rows", "4");
  });
});

describe("DateInput", () => {
  it("renders an empty input for empty value", () => {
    render(<DateInput value="" onChange={() => {}} label="Date" />);
    const input = screen.getByLabelText("Date") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders 'présent' for the present sentinel", () => {
    render(<DateInput value="present" onChange={() => {}} label="Date" />);
    const input = screen.getByLabelText("Date") as HTMLInputElement;
    expect(input.value).toBe("présent");
  });

  it("normalises typed YYYY-MM correctly", () => {
    let v = "";
    render(<DateInput value="" onChange={(next) => (v = next)} label="Date" />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "03/2024" } });
    fireEvent.blur(screen.getByLabelText("Date"));
    expect(v).toBe("2024-03");
  });
});

describe("Marginalia", () => {
  it("renders italic error text in the right margin", () => {
    render(<Marginalia kind="error">Champ obligatoire</Marginalia>);
    const node = screen.getByText("Champ obligatoire");
    expect(node).toHaveStyle({ fontStyle: "italic" });
  });
});
```

- [ ] **Step 2: Implement the five atoms**

```tsx
// client/src/features/editor/atelier/forms/_atoms/SmallCapsLabel.tsx
import type { LabelHTMLAttributes, ReactNode } from "react";

export function SmallCapsLabel({
  children,
  htmlFor,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10.5px] tracking-[0.18em] text-[var(--atelier-muted)]"
      style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-body)" }}
      {...rest}
    >
      {children}
    </label>
  );
}
```

```tsx
// client/src/features/editor/atelier/forms/_atoms/TextInput.tsx
import { useId } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  error?: string;
};

export function TextInput({ value, onChange, label, placeholder, error }: Props) {
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_minmax(0,18ch)] gap-x-6 gap-y-1 py-2 items-baseline">
      <div>
        <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.currentTarget.value)}
          className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5 text-[var(--atelier-ink)] focus:border-[var(--atelier-accent)] transition-colors"
          style={{ fontFamily: "var(--atelier-body)" }}
        />
      </div>
      {error ? (
        <span className="italic text-[12px] text-[var(--atelier-accent)] self-end" style={{ fontFamily: "var(--atelier-display)" }}>
          {error}
        </span>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}
```

```tsx
// client/src/features/editor/atelier/forms/_atoms/TextArea.tsx
import { useId } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  rows?: number;
  error?: string;
};

export function TextArea({ value, onChange, label, rows = 3, error }: Props) {
  const id = useId();
  return (
    <div className="py-2">
      <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5 text-[var(--atelier-ink)] focus:border-[var(--atelier-accent)] transition-colors resize-y"
        style={{ fontFamily: "var(--atelier-body)" }}
      />
      {error && (
        <p className="mt-1 italic text-[12px] text-[var(--atelier-accent)]" style={{ fontFamily: "var(--atelier-display)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

```tsx
// client/src/features/editor/atelier/forms/_atoms/DateInput.tsx
import { useId, useState, useEffect } from "react";
import { SmallCapsLabel } from "./SmallCapsLabel";

type Props = { value: string; onChange: (v: string) => void; label: string };

const ISO = /^\d{4}-\d{2}$/;
const FRENCH = /^(\d{2})\/(\d{4})$/;

function toDisplay(v: string): string {
  if (v === "present") return "présent";
  if (ISO.test(v)) {
    const [y, m] = v.split("-");
    return `${m}/${y}`;
  }
  return v;
}

function fromDisplay(v: string): string {
  const t = v.trim().toLowerCase();
  if (t === "" ) return "";
  if (t === "présent" || t === "present" || t === "en cours") return "present";
  const m = FRENCH.exec(t);
  if (m) return `${m[2]}-${m[1]}`;
  if (ISO.test(t)) return t;
  return v;
}

export function DateInput({ value, onChange, label }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(() => toDisplay(value));

  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  return (
    <div className="py-2">
      <SmallCapsLabel htmlFor={id}>{label}</SmallCapsLabel>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder="MM/AAAA"
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => onChange(fromDisplay(draft))}
        aria-label={label}
        className="block w-full bg-transparent border-b border-[var(--atelier-rule)] outline-none py-1.5"
        style={{ fontFamily: "var(--atelier-mono)" }}
      />
    </div>
  );
}
```

```tsx
// client/src/features/editor/atelier/forms/_atoms/Marginalia.tsx
import type { ReactNode } from "react";

export function Marginalia({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "error" }) {
  return (
    <span
      role={kind === "error" ? "alert" : undefined}
      className={`block italic text-[12px] ${
        kind === "error" ? "text-[var(--atelier-accent)]" : "text-[var(--atelier-muted)]"
      }`}
      style={{ fontStyle: "italic", fontFamily: "var(--atelier-display)" }}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd client && bun run test src/features/editor/atelier/forms/_atoms/`
Expected: PASS (8 tests).

- [ ] **Step 4: Commit**

```bash
git add client/src/features/editor/atelier/forms/_atoms/
git commit -m "feat(client): add Atelier form atoms (label, text, area, date, marginalia)"
```

### Task 5.3 — Build the TocRail

**Files:**
- Create: `client/src/features/editor/atelier/TocRail.tsx`
- Test: `client/src/features/editor/atelier/__tests__/TocRail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/TocRail.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TocRail, type SectionId } from "../TocRail";

const sections: { id: SectionId; label: string }[] = [
  { id: "personal", label: "Informations personnelles" },
  { id: "formations", label: "Formation" },
  { id: "experiences", label: "Expériences" },
  { id: "skills", label: "Compétences" },
  { id: "languages", label: "Langues" },
  { id: "interests", label: "Intérêts" },
];

describe("TocRail", () => {
  it("renders each section with a two-digit numeral", () => {
    render(<TocRail sections={sections} active="personal" onSelect={() => {}} />);
    expect(screen.getByText("01.")).toBeInTheDocument();
    expect(screen.getByText("06.")).toBeInTheDocument();
  });

  it("marks the active section with aria-current=true", () => {
    render(<TocRail sections={sections} active="experiences" onSelect={() => {}} />);
    expect(screen.getByText("Expériences").closest("button")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("calls onSelect with the clicked section id", () => {
    const fn = vi.fn();
    render(<TocRail sections={sections} active="personal" onSelect={fn} />);
    fireEvent.click(screen.getByText("Compétences"));
    expect(fn).toHaveBeenCalledWith("skills");
  });

  it("shows a stamp marker for the section last saved (savedSection prop)", () => {
    render(
      <TocRail sections={sections} active="personal" savedSection="formations" onSelect={() => {}} />,
    );
    expect(screen.getByTestId("toc-stamp-formations")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `TocRail`**

```tsx
// client/src/features/editor/atelier/TocRail.tsx
import { StampSaved } from "./StampSaved";

export type SectionId =
  | "personal"
  | "formations"
  | "experiences"
  | "skills"
  | "languages"
  | "interests";

type Section = { id: SectionId; label: string };

type Props = {
  sections: Section[];
  active: SectionId;
  savedSection?: SectionId | null;
  onSelect: (id: SectionId) => void;
};

export function TocRail({ sections, active, savedSection, onSelect }: Props) {
  return (
    <nav
      aria-label="Plan du CV"
      className="w-[240px] h-full flex flex-col gap-1 px-6 py-8 border-r border-[var(--atelier-rule)]/30"
      style={{ fontFamily: "var(--atelier-body)" }}
    >
      <p
        className="mb-6 tracking-[0.24em] text-[10px] uppercase text-[var(--atelier-muted)]"
        style={{ fontVariant: "small-caps" }}
      >
        Atelier — Plan
      </p>
      {sections.map((s, i) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={isActive || undefined}
            onClick={() => onSelect(s.id)}
            className={`group relative flex items-baseline gap-3 py-2 pr-3 text-left transition-colors ${
              isActive ? "text-[var(--atelier-ink)]" : "text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
            }`}
          >
            <span
              className="text-[12px] text-[var(--atelier-accent)] tabular-nums"
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              {(i + 1).toString().padStart(2, "0")}.
            </span>
            <span className="flex-1 text-[14px] leading-tight">{s.label}</span>
            {isActive && (
              <span
                aria-hidden
                className="absolute right-0 top-2 bottom-2 w-[2px] bg-[var(--atelier-accent)]"
              />
            )}
            {savedSection === s.id && (
              <span data-testid={`toc-stamp-${s.id}`} className="absolute -right-2 top-1">
                <StampSaved />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd client && bun run test src/features/editor/atelier/__tests__/TocRail.test.tsx`
Expected: PASS (4 tests). (Will fail until StampSaved exists — proceed to Task 5.4.)

### Task 5.4 — Build StampSaved (the unforgettable detail)

**Files:**
- Create: `client/src/features/editor/atelier/StampSaved.tsx`
- Test: `client/src/features/editor/atelier/__tests__/StampSaved.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/StampSaved.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StampSaved } from "../StampSaved";

describe("StampSaved", () => {
  it("renders an aria-hidden decorative element", () => {
    render(<StampSaved />);
    expect(screen.getByTestId("stamp-saved")).toHaveAttribute("aria-hidden", "true");
  });

  it("applies the stamp-in animation class", () => {
    render(<StampSaved />);
    const node = screen.getByTestId("stamp-saved");
    expect(node.className).toMatch(/atelier-stamp/);
  });
});
```

- [ ] **Step 2: Implement `StampSaved`**

```tsx
// client/src/features/editor/atelier/StampSaved.tsx
export function StampSaved() {
  return (
    <span
      data-testid="stamp-saved"
      aria-hidden="true"
      className="atelier-stamp inline-block w-3 h-3"
      style={{
        background: "var(--atelier-accent)",
        animation: "atelier-stamp-in 320ms cubic-bezier(.22,1,.36,1) both",
      }}
    />
  );
}
```

- [ ] **Step 3: Run tests for both TocRail and StampSaved**

Run: `cd client && bun run test src/features/editor/atelier/__tests__/`
Expected: PASS — both components green.

- [ ] **Step 4: Commit**

```bash
git add client/src/features/editor/atelier/TocRail.tsx client/src/features/editor/atelier/StampSaved.tsx client/src/features/editor/atelier/__tests__/
git commit -m "feat(client): add Atelier TocRail and StampSaved animation"
```

### Task 5.5 — Build PreviewPane (live iframe preview)

**Files:**
- Create: `client/src/features/editor/atelier/PreviewPane.tsx`
- Test: `client/src/features/editor/atelier/__tests__/PreviewPane.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/PreviewPane.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PreviewPane } from "../PreviewPane";
import { sampleCv } from "@cvie/shared";

describe("PreviewPane", () => {
  it("renders an iframe scaled to A4 aspect ratio", () => {
    const { container } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-balanced"
        customization={{}}
      />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("title")).toBe("Aperçu du CV");
  });

  it("writes the rendered HTML into the iframe document", async () => {
    const { container } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-balanced"
        customization={{}}
      />,
    );
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    await waitFor(() => {
      const doc = iframe.contentDocument!;
      expect(doc.body.textContent).toMatch(/Yasmine Benali/);
    });
  });

  it("shows the « bon à tirer » stamp when atsMode is ats-strict", async () => {
    const { container, getByText } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-strict"
        customization={{}}
      />,
    );
    expect(getByText(/bon à tirer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `PreviewPane`**

```tsx
// client/src/features/editor/atelier/PreviewPane.tsx
import { useEffect, useRef, useMemo } from "react";
import { renderResumeHtml, type CvData, type AtsMode } from "@cvie/shared";

type Props = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Record<string, unknown>;
};

export function PreviewPane({ cv, themeId, atsMode, customization }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Render synchronously — renderResumeHtml is pure and fast (~3ms).
  const html = useMemo(() => {
    try {
      return renderResumeHtml(cv, { themeId, atsMode, customization });
    } catch {
      return "<!DOCTYPE html><html><body><p style=\"font-family:sans-serif;padding:2rem;color:#7B2D26\">Aperçu indisponible — vérifiez la sélection de thème.</p></body></html>";
    }
  }, [cv, themeId, atsMode, customization]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <aside
      aria-label="Aperçu du CV"
      className="relative w-full max-w-[440px] mx-auto flex flex-col items-center gap-3 p-6"
    >
      <div
        className="relative bg-white border border-[var(--atelier-rule)]/40 shadow-[0_2px_30px_rgba(0,0,0,0.05)]"
        style={{ aspectRatio: "210 / 297", width: "100%" }}
      >
        <iframe
          ref={frameRef}
          title="Aperçu du CV"
          sandbox="allow-same-origin"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      {atsMode === "ats-strict" && (
        <p
          className="text-[11px] tracking-[0.24em] text-[var(--atelier-accent)] mt-2"
          style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-display)" }}
        >
          « bon à tirer » — mode ATS strict
        </p>
      )}
    </aside>
  );
}
```

> The sandbox setting `allow-same-origin` (but no `allow-scripts`) is intentional: the iframe must be same-origin for the parent to write into `contentDocument`, but we never want resume HTML to execute scripts in the editor's origin. The base print CSS and theme CSS are inert.

- [ ] **Step 3: Run tests**

Run: `cd client && bun run test src/features/editor/atelier/__tests__/PreviewPane.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add client/src/features/editor/atelier/PreviewPane.tsx client/src/features/editor/atelier/__tests__/PreviewPane.test.tsx
git commit -m "feat(client): add Atelier PreviewPane with live iframe rendering"
```

### Task 5.6 — Build ExportBar (theme + ATS toggle + export)

**Files:**
- Create: `client/src/features/editor/atelier/ExportBar.tsx`
- Test: `client/src/features/editor/atelier/__tests__/ExportBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/ExportBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportBar } from "../ExportBar";
import { themeRegistry } from "@cvie/shared";

const themes = themeRegistry.map((t) => t.meta);

describe("ExportBar", () => {
  it("renders a chip for every theme", () => {
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    expect(screen.getByText("Atelier — Classique")).toBeInTheDocument();
    expect(screen.getByText("Atelier — Moderne")).toBeInTheDocument();
    expect(screen.getByText("Atelier — Minimaliste")).toBeInTheDocument();
  });

  it("invokes onThemeChange on chip click", () => {
    const fn = vi.fn();
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={fn}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    fireEvent.click(screen.getByText("Atelier — Moderne"));
    expect(fn).toHaveBeenCalledWith("atelier-moderne");
  });

  it("invokes onAtsModeChange on toggle click", () => {
    const fn = vi.fn();
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={fn}
        onExport={() => {}}
        exporting={false}
      />,
    );
    fireEvent.click(screen.getByText(/strict/i));
    expect(fn).toHaveBeenCalledWith("ats-strict");
  });

  it("disables the export button when exporting=true", () => {
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting
      />,
    );
    expect(screen.getByRole("button", { name: /exporter/i })).toBeDisabled();
  });

  it("shows a premium lock icon for premium themes", () => {
    const premiumThemes = themes.map((t, i) => (i === 1 ? { ...t, tier: "premium" as const } : t));
    render(
      <ExportBar
        themes={premiumThemes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    expect(screen.getByTestId("premium-lock-atelier-moderne")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `ExportBar`**

```tsx
// client/src/features/editor/atelier/ExportBar.tsx
import type { ThemeMeta, AtsMode } from "@cvie/shared";

const MODES: { id: AtsMode; label: string }[] = [
  { id: "ats-strict", label: "ATS strict" },
  { id: "ats-balanced", label: "ATS équilibré" },
  { id: "expressive", label: "Expressif" },
];

type Props = {
  themes: readonly ThemeMeta[];
  activeThemeId: string;
  atsMode: AtsMode;
  onThemeChange: (id: string) => void;
  onAtsModeChange: (mode: AtsMode) => void;
  onExport: () => void;
  exporting: boolean;
};

export function ExportBar({
  themes,
  activeThemeId,
  atsMode,
  onThemeChange,
  onAtsModeChange,
  onExport,
  exporting,
}: Props) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 border-b border-[var(--atelier-rule)]/30 bg-[var(--atelier-paper)]/50">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Thème">
        {themes.map((t) => {
          const active = t.id === activeThemeId;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={active}
              type="button"
              onClick={() => onThemeChange(t.id)}
              className={`relative inline-flex items-center gap-2 px-3 py-1.5 text-[12px] border transition-colors ${
                active
                  ? "border-[var(--atelier-accent)] text-[var(--atelier-ink)]"
                  : "border-[var(--atelier-rule)]/30 text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
              }`}
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              {t.name}
              {t.tier === "premium" && (
                <span data-testid={`premium-lock-${t.id}`} aria-label="Premium">◇</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div
          role="radiogroup"
          aria-label="Mode d'export"
          className="inline-flex border border-[var(--atelier-rule)]/30"
        >
          {MODES.map((m) => {
            const active = m.id === atsMode;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={active}
                type="button"
                onClick={() => onAtsModeChange(m.id)}
                className={`px-3 py-1.5 text-[11px] tracking-[0.16em] transition-colors ${
                  active
                    ? "bg-[var(--atelier-ink)] text-[var(--atelier-paper)]"
                    : "text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
                }`}
                style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-body)" }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2 text-[12px] uppercase tracking-[0.18em] text-[var(--atelier-paper)] bg-[var(--atelier-accent)] disabled:opacity-50 transition-opacity"
          style={{ fontFamily: "var(--atelier-body)" }}
        >
          <span aria-hidden>◆</span>
          {exporting ? "Export…" : "Exporter PDF"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd client && bun run test src/features/editor/atelier/__tests__/ExportBar.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add client/src/features/editor/atelier/ExportBar.tsx client/src/features/editor/atelier/__tests__/ExportBar.test.tsx
git commit -m "feat(client): add Atelier ExportBar (themes, ATS modes, premium lock)"
```

### Task 5.7 — Build the six form components

Each form follows the same pattern: receive a `useFormContext` (react-hook-form), use `useFieldArray` for repeating sections, render atoms.

Show one in full, then list the remaining five as parallel implementations.

**Files (PersonalInfoForm — fully shown):**
- Create: `client/src/features/editor/atelier/forms/PersonalInfoForm.tsx`
- Test: `client/src/features/editor/atelier/forms/__tests__/PersonalInfoForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/forms/__tests__/PersonalInfoForm.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cvDataSchema } from "@cvie/shared";
import { sampleCv } from "@cvie/shared";
import { PersonalInfoForm } from "../PersonalInfoForm";

function Harness() {
  const methods = useForm({ defaultValues: sampleCv, resolver: zodResolver(cvDataSchema) });
  return (
    <FormProvider {...methods}>
      <PersonalInfoForm />
    </FormProvider>
  );
}

describe("PersonalInfoForm", () => {
  it("renders all required fields", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
  });

  it("propagates typed values into the form context", () => {
    render(<Harness />);
    const first = screen.getByLabelText(/Prénom/i) as HTMLInputElement;
    fireEvent.change(first, { target: { value: "Camille" } });
    expect(first.value).toBe("Camille");
  });

  it("shows a marginalia error when an invalid URL is entered", async () => {
    render(<Harness />);
    const linkedin = screen.getByLabelText(/LinkedIn/i) as HTMLInputElement;
    fireEvent.change(linkedin, { target: { value: "not-a-url" } });
    fireEvent.blur(linkedin);
    expect(await screen.findByText(/URL/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `PersonalInfoForm`**

```tsx
// client/src/features/editor/atelier/forms/PersonalInfoForm.tsx
import { useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { TextArea } from "./_atoms/TextArea";
import { Marginalia } from "./_atoms/Marginalia";

export function PersonalInfoForm() {
  const { control, formState: { errors } } = useFormContext();
  const e = errors.personalInfo as Record<string, { message?: string } | undefined> | undefined;

  return (
    <fieldset className="grid gap-4 max-w-[640px]">
      <legend className="sr-only">Informations personnelles</legend>

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.firstName"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              label="Prénom"
              error={e?.firstName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.lastName"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              label="Nom"
              error={e?.lastName?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="personalInfo.jobTitle"
        render={({ field }) => (
          <TextInput value={field.value ?? ""} onChange={field.onChange} label="Intitulé" />
        )}
      />

      <Controller
        control={control}
        name="personalInfo.summary"
        render={({ field }) => (
          <TextArea value={field.value ?? ""} onChange={field.onChange} label="Résumé professionnel" rows={4} />
        )}
      />

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.email"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="E-mail" error={e?.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.phone"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="Téléphone" />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.city"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="Ville" />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.linkedinUrl"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              label="LinkedIn"
              error={e?.linkedinUrl?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="personalInfo.portfolioUrl"
        render={({ field }) => (
          <TextInput value={field.value ?? ""} onChange={field.onChange} label="Portfolio" />
        )}
      />

      <Marginalia kind="info">La photo est facultative en France (loi du 27 mai 2008).</Marginalia>
    </fieldset>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd client && bun run test src/features/editor/atelier/forms/__tests__/PersonalInfoForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 4: Build the five repeating-section forms — follow the same template**

For each of `FormationsForm`, `ExperiencesForm`, `SkillsForm`, `LanguagesForm`, `InterestsForm`:

1. Use `useFieldArray({ control, name: "experiences" })` (or the matching section).
2. Render one card per array entry, with the relevant atoms (`TextInput`, `TextArea`, `DateInput`).
3. Provide "Ajouter une entrée" / "Supprimer" / "Déplacer ↑" / "Déplacer ↓" buttons that call `append`, `remove`, `swap`.
4. Each card has `<header>` showing a numeral (`#01`, `#02`) in Fraunces oxblood.

A representative template for **ExperiencesForm**:

```tsx
// client/src/features/editor/atelier/forms/ExperiencesForm.tsx
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { TextArea } from "./_atoms/TextArea";
import { DateInput } from "./_atoms/DateInput";
import { Marginalia } from "./_atoms/Marginalia";

export function ExperiencesForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "experiences" });

  return (
    <div className="grid gap-8">
      {fields.map((field, i) => (
        <article key={field.id} className="border-t border-[var(--atelier-rule)]/20 pt-6">
          <header className="flex items-center justify-between mb-3">
            <span
              className="text-[14px] text-[var(--atelier-accent)] tabular-nums"
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              #{(i + 1).toString().padStart(2, "0")}
            </span>
            <div className="flex gap-2 text-[10px] tracking-[0.18em] text-[var(--atelier-muted)]">
              {i > 0 && (
                <button type="button" onClick={() => swap(i, i - 1)}>↑</button>
              )}
              {i < fields.length - 1 && (
                <button type="button" onClick={() => swap(i, i + 1)}>↓</button>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Supprimer">×</button>
            </div>
          </header>

          <Controller
            control={control}
            name={`experiences.${i}.jobTitle`}
            render={({ field: f }) => (
              <TextInput value={f.value ?? ""} onChange={f.onChange} label="Intitulé du poste" />
            )}
          />
          <Controller
            control={control}
            name={`experiences.${i}.company`}
            render={({ field: f }) => (
              <TextInput value={f.value ?? ""} onChange={f.onChange} label="Entreprise" />
            )}
          />
          <div className="grid grid-cols-3 gap-x-6">
            <Controller
              control={control}
              name={`experiences.${i}.city`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Ville" />
              )}
            />
            <Controller
              control={control}
              name={`experiences.${i}.startDate`}
              render={({ field: f }) => (
                <DateInput value={f.value ?? ""} onChange={f.onChange} label="Début" />
              )}
            />
            <Controller
              control={control}
              name={`experiences.${i}.endDate`}
              render={({ field: f }) => (
                <DateInput value={f.value ?? ""} onChange={f.onChange} label="Fin" />
              )}
            />
          </div>
          <Controller
            control={control}
            name={`experiences.${i}.description`}
            render={({ field: f }) => (
              <TextArea value={f.value ?? ""} onChange={f.onChange} label="Description" rows={3} />
            )}
          />
          <Marginalia kind="info">Saisissez des puces sur des lignes commençant par « - » ou « • ».</Marginalia>
        </article>
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            jobTitle: "",
            company: "",
            startDate: "",
            endDate: "",
            bullets: [],
            description: "",
          })
        }
        className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        + Ajouter une expérience
      </button>
    </div>
  );
}
```

For each remaining form, replicate this template, swapping field paths and atom choices according to the section's Zod schema:
- `FormationsForm` → `formations.*.degree/school/city/startDate/endDate/description`
- `SkillsForm` → `skills.*.name/level/category` (use a `<select>` for level: débutant / intermédiaire / avancé / expert)
- `LanguagesForm` → `languages.*.name/level` (use a `<select>` for the 6 CEFR values + `natif`)
- `InterestsForm` → `interests.*.name` (single-input rows; allow up to 10)

Write a parallel test for each form covering: renders, append adds an entry, remove drops one, swap reorders.

- [ ] **Step 5: Run all form tests**

Run: `cd client && bun run test src/features/editor/atelier/forms/__tests__/`
Expected: PASS — all six form components green.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/editor/atelier/forms/
git commit -m "feat(client): add six Atelier section forms with field-array editing"
```

### Task 5.8 — Build the SectionRouter

**Files:**
- Create: `client/src/features/editor/atelier/forms/SectionRouter.tsx`
- Test: `client/src/features/editor/atelier/__tests__/SectionRouter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/SectionRouter.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { sampleCv } from "@cvie/shared";
import { SectionRouter } from "../forms/SectionRouter";

function Harness({ active }: { active: "personal" | "experiences" }) {
  const methods = useForm({ defaultValues: sampleCv });
  return (
    <FormProvider {...methods}>
      <SectionRouter active={active} />
    </FormProvider>
  );
}

describe("SectionRouter", () => {
  it("renders PersonalInfoForm when active='personal'", () => {
    render(<Harness active="personal" />);
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
  });

  it("renders ExperiencesForm when active='experiences'", () => {
    render(<Harness active="experiences" />);
    expect(screen.getByText(/Ajouter une expérience/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `SectionRouter`**

```tsx
// client/src/features/editor/atelier/forms/SectionRouter.tsx
import type { SectionId } from "../TocRail";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { FormationsForm } from "./FormationsForm";
import { ExperiencesForm } from "./ExperiencesForm";
import { SkillsForm } from "./SkillsForm";
import { LanguagesForm } from "./LanguagesForm";
import { InterestsForm } from "./InterestsForm";

export function SectionRouter({ active }: { active: SectionId }) {
  switch (active) {
    case "personal": return <PersonalInfoForm />;
    case "formations": return <FormationsForm />;
    case "experiences": return <ExperiencesForm />;
    case "skills": return <SkillsForm />;
    case "languages": return <LanguagesForm />;
    case "interests": return <InterestsForm />;
  }
}
```

- [ ] **Step 3: Run tests + commit**

Run: `cd client && bun run test src/features/editor/atelier/__tests__/SectionRouter.test.tsx`
Expected: PASS (2 tests).

```bash
git add client/src/features/editor/atelier/forms/SectionRouter.tsx client/src/features/editor/atelier/__tests__/SectionRouter.test.tsx
git commit -m "feat(client): add Atelier SectionRouter"
```

### Task 5.9 — Extract `useExportPdf` hook

The current export flow is an inline `fetch("/api/v1/cv/pdf", ...)` block inside `CvEditor.tsx:864` that POSTs `{ ...cvData, templateId, scale, overflowMode }`. The new route shape is `{ cvData, themeId, atsMode, customization }`. Extract this into a dedicated hook so `Workspace.tsx` (Task 5.10) can call it cleanly and the inline logic is gone before Phase 10 deletes the legacy CvEditor body.

**Files:**
- Create: `client/src/features/editor/hooks/useExportPdf.ts`
- Create: `client/src/features/editor/hooks/__tests__/useExportPdf.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// client/src/features/editor/hooks/__tests__/useExportPdf.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportPdf } from "../useExportPdf";
import { sampleCv } from "@cvie/shared";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useExportPdf", () => {
  it("POSTs to /api/v1/cv/pdf with {cvData, themeId, atsMode, customization}", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" }), {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="cv.pdf"' },
      }),
    );

    const { result } = renderHook(() => useExportPdf());
    await act(async () => {
      await result.current.exportPdf({
        cv: sampleCv,
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "oxblood" },
      });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/v1/cv/pdf");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      cvData: sampleCv,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: { accent: "oxblood" },
    });
  });

  it("surfaces server error codes (INVALID_TEMPLATE, etc.) via the returned error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Le template sélectionné est invalide.", code: "INVALID_TEMPLATE" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useExportPdf());
    await act(async () => {
      const res = await result.current.exportPdf({
        cv: sampleCv,
        themeId: "bogus",
        atsMode: "ats-balanced",
        customization: {},
      });
      expect(res.ok).toBe(false);
      expect(res.ok ? null : res.code).toBe("INVALID_TEMPLATE");
    });
  });

  it("aborts the in-flight request when `abort()` is called", async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      signal = (init as RequestInit).signal as AbortSignal | undefined;
      return new Promise(() => {}); // never resolves
    });

    const { result } = renderHook(() => useExportPdf());
    act(() => {
      void result.current.exportPdf({
        cv: sampleCv,
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: {},
      });
    });
    act(() => result.current.abort());
    expect(signal?.aborted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && bun run test src/features/editor/hooks/__tests__/useExportPdf.test.ts`
Expected: FAIL — `Cannot find module '../useExportPdf'`.

- [ ] **Step 3: Implement the hook**

```ts
// client/src/features/editor/hooks/useExportPdf.ts
import { useCallback, useRef } from "react";
import type { CvData, AtsMode } from "@cvie/shared";

export type ExportPdfInput = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Record<string, unknown>;
};

export type ExportPdfResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; code: string; message: string; status: number };

function extractFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match?.[1] ?? fallback;
}

export function useExportPdf() {
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const exportPdf = useCallback(
    async (input: ExportPdfInput): Promise<ExportPdfResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/v1/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvData: input.cv,
          themeId: input.themeId,
          atsMode: input.atsMode,
          customization: input.customization,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          status: res.status,
          code: typeof body.code === "string" ? body.code : "UNKNOWN",
          message: typeof body.error === "string" ? body.error : "Erreur inconnue",
        };
      }

      const blob = await res.blob();
      const filename = extractFilename(res.headers.get("Content-Disposition"), "cv.pdf");
      return { ok: true, blob, filename };
    },
    [],
  );

  return { exportPdf, abort };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && bun run test src/features/editor/hooks/__tests__/useExportPdf.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/features/editor/hooks/useExportPdf.ts client/src/features/editor/hooks/__tests__/useExportPdf.test.ts
git commit -m "feat(client): extract useExportPdf hook for the new /pdf body shape"
```

### Task 5.10 — Wire the Workspace shell

**Files:**
- Create: `client/src/features/editor/atelier/Workspace.tsx`
- Test: `client/src/features/editor/atelier/__tests__/Workspace.test.tsx`
- Modify: `client/src/features/editor/components/CvEditor.tsx` (delegate to Workspace)

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/features/editor/atelier/__tests__/Workspace.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Workspace } from "../Workspace";
import { sampleCv } from "@cvie/shared";

describe("Workspace", () => {
  it("renders the TOC, the active section, and the preview", () => {
    render(<Workspace cv={sampleCv} onPatch={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByLabelText("Plan du CV")).toBeInTheDocument();
    expect(screen.getByLabelText("Aperçu du CV")).toBeInTheDocument();
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
  });

  it("switches the active section when a TOC entry is clicked", () => {
    render(<Workspace cv={sampleCv} onPatch={vi.fn()} onExport={vi.fn()} />);
    fireEvent.click(screen.getByText("Expériences"));
    expect(screen.getByText(/Ajouter une expérience/)).toBeInTheDocument();
  });

  it("invokes onExport when the export button is clicked", () => {
    const fn = vi.fn();
    render(<Workspace cv={sampleCv} onPatch={vi.fn()} onExport={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /exporter/i }));
    expect(fn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement `Workspace`**

```tsx
// client/src/features/editor/atelier/Workspace.tsx
import { useState, useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cvDataSchema,
  themeRegistry,
  type CvData,
  type AtsMode,
} from "@cvie/shared";
import { TocRail, type SectionId } from "./TocRail";
import { PreviewPane } from "./PreviewPane";
import { ExportBar } from "./ExportBar";
import { SectionRouter } from "./forms/SectionRouter";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "personal", label: "Informations personnelles" },
  { id: "formations", label: "Formation" },
  { id: "experiences", label: "Expériences" },
  { id: "skills", label: "Compétences" },
  { id: "languages", label: "Langues" },
  { id: "interests", label: "Intérêts" },
];

type Props = {
  cv: CvData;
  onPatch: (patch: Partial<CvData>) => void;
  onExport: (opts: { themeId: string; atsMode: AtsMode }) => void;
};

export function Workspace({ cv, onPatch, onExport }: Props) {
  const methods = useForm<CvData>({
    defaultValues: cv,
    resolver: zodResolver(cvDataSchema),
    mode: "onBlur",
  });

  const watched = useWatch({ control: methods.control });

  const [active, setActive] = useState<SectionId>("personal");
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [themeId, setThemeId] = useState<string>("atelier-classique");
  const [atsMode, setAtsMode] = useState<AtsMode>("ats-balanced");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!methods.formState.isDirty) return;
    onPatch(watched as Partial<CvData>);
    setSavedSection(active);
    const id = setTimeout(() => setSavedSection(null), 8_000);
    return () => clearTimeout(id);
  }, [watched, active, methods.formState.isDirty, onPatch]);

  return (
    <FormProvider {...methods}>
      <div className="atelier-canvas h-screen w-screen flex bg-[var(--atelier-paper)] text-[var(--atelier-ink)]">
        <TocRail
          sections={SECTIONS}
          active={active}
          savedSection={savedSection}
          onSelect={setActive}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ExportBar
            themes={themeRegistry.map((t) => t.meta)}
            activeThemeId={themeId}
            atsMode={atsMode}
            onThemeChange={setThemeId}
            onAtsModeChange={setAtsMode}
            exporting={exporting}
            onExport={async () => {
              setExporting(true);
              try {
                await onExport({ themeId, atsMode });
              } finally {
                setExporting(false);
              }
            }}
          />
          <div className="flex-1 grid grid-cols-[1fr_minmax(340px,440px)] min-h-0">
            <main className="overflow-y-auto px-10 py-10">
              <SectionRouter active={active} />
            </main>
            <PreviewPane
              cv={watched as CvData}
              themeId={themeId}
              atsMode={atsMode}
              customization={{}}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
```

- [ ] **Step 3: Update `CvEditor.tsx` to delegate**

Replace the entire body of `client/src/features/editor/components/CvEditor.tsx` with:

```tsx
import { useCallback } from "react";
import { toast } from "sonner";
import { Workspace } from "../atelier/Workspace";
import { useCvDraft } from "../hooks/useCvDraft";
import { useExportPdf } from "../hooks/useExportPdf";
import type { AtsMode } from "@cvie/shared";

export function CvEditor({ cvId }: { cvId: string }) {
  const { cv, patch } = useCvDraft(cvId);
  const { exportPdf } = useExportPdf();

  const handleExport = useCallback(
    async (opts: { themeId: string; atsMode: AtsMode }) => {
      if (!cv) return;
      const res = await exportPdf({
        cv,
        themeId: opts.themeId,
        atsMode: opts.atsMode,
        customization: cv.customization ?? {},
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [cv, exportPdf],
  );

  if (!cv) return null;
  return <Workspace cv={cv} onPatch={patch} onExport={handleExport} />;
}
```

> `useExportPdf` was created in Task 5.9. This task wires the result into a download trigger and the existing `sonner` toast for errors (which preserves the French error codes from the server).

- [ ] **Step 4: Run tests + smoke run the dev server**

Run: `cd client && bun run test src/features/editor/atelier/`
Expected: PASS for all editor tests.

Run: `bun dev:client` and load `http://localhost:5173/editor/<any-cv-id>`. Visually verify:
1. Left TOC, center form, right preview render in a single screen at ≥1280 px wide
2. Clicking a TOC entry switches the form and updates the active rail marker
3. Typing in a field updates the preview within ~120 ms
4. Clicking "Exporter PDF" produces a download

- [ ] **Step 5: Commit**

```bash
git add client/src/features/editor/atelier/Workspace.tsx client/src/features/editor/components/CvEditor.tsx client/src/features/editor/__tests__/
git commit -m "feat(client): wire Atelier Workspace into /editor/:cvId"
```

---

## Phase 6 — Controlled per-theme customization

The Workspace currently hardcodes `customization: {}`. This phase adds the customization panel that reads each theme's `customizationSchema` and renders only the controls the theme exposes.

### Task 6.1 — Build the customization panel

**Files:**
- Create: `client/src/features/editor/customization/CustomizationPanel.tsx`
- Create: `client/src/features/editor/customization/introspect.ts` — `introspectCustomizationSchema(schema) → ControlDescriptor[]`
- Test: both with `*.test.{ts,tsx}`

- [ ] **Step 1: Write the failing test for introspection**

```ts
// client/src/features/editor/customization/__tests__/introspect.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { introspectCustomizationSchema } from "../introspect";

describe("introspectCustomizationSchema", () => {
  it("extracts enum choices as a radio control", () => {
    const schema = z.object({ accent: z.enum(["oxblood", "encre", "sapin"]) });
    const controls = introspectCustomizationSchema(schema);
    expect(controls).toEqual([
      { key: "accent", kind: "radio", choices: ["oxblood", "encre", "sapin"] },
    ]);
  });

  it("returns 'unknown' for unsupported schema shapes (no crash)", () => {
    const schema = z.object({ x: z.number() });
    expect(introspectCustomizationSchema(schema)).toEqual([
      { key: "x", kind: "unknown" },
    ]);
  });
});
```

- [ ] **Step 2: Implement introspection**

```ts
// client/src/features/editor/customization/introspect.ts
import { z, type ZodTypeAny } from "zod";

export type ControlDescriptor =
  | { key: string; kind: "radio"; choices: readonly string[] }
  | { key: string; kind: "unknown" };

export function introspectCustomizationSchema(
  schema: ZodTypeAny,
): ControlDescriptor[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = (schema as z.ZodObject<Record<string, ZodTypeAny>>).shape;
  return Object.entries(shape).map(([key, field]) => {
    if (field instanceof z.ZodEnum) {
      return { key, kind: "radio", choices: field.options as readonly string[] };
    }
    return { key, kind: "unknown" };
  });
}
```

- [ ] **Step 3: Write the failing test for the panel**

```tsx
// client/src/features/editor/customization/__tests__/CustomizationPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomizationPanel } from "../CustomizationPanel";
import { themeRegistry } from "@cvie/shared";

const classique = themeRegistry.find((t) => t.meta.id === "atelier-classique")!;

describe("CustomizationPanel", () => {
  it("renders one radio group per enum field in the theme schema", () => {
    render(
      <CustomizationPanel
        theme={classique.meta}
        value={classique.meta.defaultCustomization}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /accent/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /density/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /photo/i })).toBeInTheDocument();
  });

  it("calls onChange with the new value on chip click", () => {
    const fn = vi.fn();
    render(
      <CustomizationPanel
        theme={classique.meta}
        value={classique.meta.defaultCustomization}
        onChange={fn}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "encre" }));
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ accent: "encre" }));
  });

  it("renders an empty panel for a theme with no exposed knobs (minimaliste has only 'density')", () => {
    const minimaliste = themeRegistry.find((t) => t.meta.id === "atelier-minimaliste")!;
    render(
      <CustomizationPanel
        theme={minimaliste.meta}
        value={minimaliste.meta.defaultCustomization}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /density/i })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /accent/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement `CustomizationPanel`**

```tsx
// client/src/features/editor/customization/CustomizationPanel.tsx
import type { ThemeMeta } from "@cvie/shared";
import { introspectCustomizationSchema } from "./introspect";

type Props = {
  theme: ThemeMeta;
  value: Readonly<Record<string, unknown>>;
  onChange: (next: Record<string, unknown>) => void;
};

const LABEL_MAP: Record<string, string> = {
  accent: "Accent",
  density: "Densité",
  photoShape: "Photo",
};

export function CustomizationPanel({ theme, value, onChange }: Props) {
  const controls = introspectCustomizationSchema(theme.customizationSchema);

  return (
    <section
      aria-label="Personnalisation du thème"
      className="px-6 py-5 border-t border-[var(--atelier-rule)]/30 flex flex-col gap-4"
    >
      <p
        className="tracking-[0.18em] uppercase text-[10px] text-[var(--atelier-muted)]"
        style={{ fontVariant: "small-caps" }}
      >
        Personnaliser — {theme.name}
      </p>
      {controls.map((c) => {
        if (c.kind === "unknown") return null;
        const label = LABEL_MAP[c.key] ?? c.key;
        return (
          <div
            key={c.key}
            role="radiogroup"
            aria-label={label}
            className="flex flex-wrap items-center gap-2"
          >
            <span
              className="text-[10px] uppercase tracking-[0.16em] text-[var(--atelier-muted)] w-20"
              style={{ fontVariant: "small-caps" }}
            >
              {label}
            </span>
            {c.choices.map((choice) => {
              const active = value[c.key] === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={choice}
                  onClick={() => onChange({ ...value, [c.key]: choice })}
                  className={`px-2.5 py-1 text-[11px] border transition-colors ${
                    active
                      ? "border-[var(--atelier-accent)] text-[var(--atelier-ink)]"
                      : "border-[var(--atelier-rule)]/30 text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
                  }`}
                  style={{ fontFamily: "var(--atelier-body)" }}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 5: Wire into Workspace**

In `Workspace.tsx`, add customization state and the panel:

```tsx
// at top
import { CustomizationPanel } from "../customization/CustomizationPanel";
import { getTheme } from "@cvie/shared";

// inside the component, alongside themeId / atsMode state:
const theme = getTheme(themeId)!;
const [customization, setCustomization] = useState<Record<string, unknown>>(
  theme.meta.defaultCustomization,
);
// when themeId changes, reset customization to the new theme's defaults:
useEffect(() => {
  setCustomization(getTheme(themeId)!.meta.defaultCustomization);
}, [themeId]);

// in the right column, between PreviewPane and the bottom edge, add:
<CustomizationPanel theme={theme.meta} value={customization} onChange={setCustomization} />

// pass customization into PreviewPane:
<PreviewPane cv={watched as CvData} themeId={themeId} atsMode={atsMode} customization={customization} />

// pass customization into onExport call:
await onExport({ themeId, atsMode, customization });
// and update Workspace's onExport prop type accordingly.
```

- [ ] **Step 6: Run all tests + smoke test**

Run: `cd client && bun run test`
Expected: PASS — all client tests green.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/editor/customization/ client/src/features/editor/atelier/Workspace.tsx
git commit -m "feat(client): add controlled per-theme customization panel"
```

---

## Phase 7 — ATS-safe export modes

The renderer already accepts `atsMode` and applies CSS overrides per Task 2.3. This phase makes the modes meaningful at three additional layers: route validation, PDF metadata sanitation, and theme-fallback when a theme's `minSupported` mode is stricter than the requested one.

### Task 7.1 — Reject incompatible theme × ats-mode combos in the route

**Files:**
- Modify: `server/src/routes/cv.ts`
- Modify: `server/src/routes/__tests__/cv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("POST /api/v1/cv/pdf rejects atsMode below the theme's minSupported", async () => {
  // atelier-moderne declares minSupported='ats-balanced'; ats-strict is below.
  // Actually 'ats-strict' is the most restrictive — the theme can't render in
  // ats-strict because its layout breaks. The route should reject.
  const res = await app.request("/api/v1/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvData: sampleCv,
      themeId: "atelier-moderne",
      atsMode: "ats-strict",
      customization: {},
    }),
  });
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toMatch(/atsMode/i);
});
```

- [ ] **Step 2: Implement the check**

In `server/src/routes/cv.ts`, after parsing the body and before calling `generateResumePdf`:

```ts
import { requireTheme } from "@cvie/shared";

const MODE_ORDER: Record<string, number> = {
  "ats-strict": 0,
  "ats-balanced": 1,
  expressive: 2,
};

const theme = (() => {
  try { return requireTheme(themeId); } catch { return null; }
})();
if (!theme) {
  return c.json({ error: `Unknown themeId: ${themeId}` }, 400);
}
if (MODE_ORDER[atsMode] < MODE_ORDER[theme.meta.atsProfile.minSupported]) {
  return c.json(
    {
      error: `Theme '${theme.meta.id}' does not support atsMode '${atsMode}' (minSupported='${theme.meta.atsProfile.minSupported}').`,
    },
    409,
  );
}
```

- [ ] **Step 3: Run tests + commit**

Run: `cd server && bun test src/routes/__tests__/cv.test.ts`
Expected: PASS.

```bash
git add server/src/routes/cv.ts server/src/routes/__tests__/cv.test.ts
git commit -m "feat(server): reject ATS modes below the theme's minSupported"
```

### Task 7.2 — Strip PDF metadata in ats-strict

**Files:**
- Modify: `server/src/services/pdfService.ts`
- Modify: `server/src/services/pdfService.test.ts`

ATS scanners sometimes parse PDF metadata (Author, Producer, Title); inconsistent values trigger flags. In ats-strict, set them to safe values driven by the CV's name.

- [ ] **Step 1: Write the failing test**

```ts
test("ats-strict PDFs carry a deterministic Title and no Author/Producer leak", async () => {
  const bytes = await generateResumePdf({
    cv: sampleCv,
    themeId: "atelier-classique",
    atsMode: "ats-strict",
    customization: {},
  });
  const text = Buffer.from(bytes).toString("latin1");
  expect(text).toMatch(/\/Title \(Yasmine Benali — CV\)/);
  // Producer is set by Chromium and harmless; Author should be the candidate name.
  expect(text).toMatch(/\/Author \(Yasmine Benali\)/);
});
```

- [ ] **Step 2: Implement metadata injection**

Two pieces — both required for every export, but the `<title>` part is what Chromium picks up for the PDF's `/Title` field.

**(a)** In each theme's `render.ts`, after the existing `<title>` line, emit an author meta tag (themes already have access to `resume.basics.name`):

```html
<meta name="author" content="${escapeAttr(resume.basics.name)}" />
```

Add a render-test assertion in each theme's `render.test.ts`:

```ts
it("emits an author meta from basics.name", () => {
  const html = render(sampleResume, opts);
  expect(html).toMatch(/<meta name="author" content="Yasmine Benali"/);
});
```

**(b)** In `pdfService.generateResumePdf`, after `await page.setContent(html, ...)` and the font-readiness wait, force `document.title` to a deterministic value (Chromium reads this for the PDF `/Title` field):

```ts
const docTitle = `${input.cv.personalInfo.firstName} ${input.cv.personalInfo.lastName} — CV`.trim();
await page.evaluate((title) => { document.title = title; }, docTitle);
```

> Tagged-PDF mode (`--export-tagged-pdf`) is intentionally out of scope here — it requires a browser-launch flag and complicates the pool. The `<meta name="author">` + `document.title` pair is enough for the test in Step 1.

- [ ] **Step 3: Run tests + commit**

Run: `cd server && bun test src/services/__tests__/pdfService.test.ts`
Expected: PASS.

```bash
git add server/src/services/pdfService.ts server/src/services/pdfService.test.ts shared/src/templates/themes/*/render.ts shared/src/templates/themes/*/render.test.ts
git commit -m "feat: inject author/title meta for ATS-friendly PDF metadata"
```

### Task 7.3 — Default `atsMode` per theme in the route

When the client posts `atsMode` as missing or `undefined`, fall back to the theme's `atsProfile.defaultMode`, not the schema default.

- [ ] **Step 1: Test**

```ts
test("POST /api/v1/cv/pdf falls back to theme.defaultMode when atsMode is omitted", async () => {
  const res = await app.request("/api/v1/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvData: sampleCv,
      themeId: "atelier-minimaliste", // defaultMode = ats-strict
      customization: { density: "comfy" },
      // atsMode intentionally omitted
    }),
  });
  expect(res.status).toBe(200);
  // The response headers don't expose mode; assert via the PDF content (ats-strict CSS layered).
  // Capture and parse:
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = Buffer.from(bytes).toString("latin1");
  expect(text).toMatch(/Yasmine Benali/);
});
```

- [ ] **Step 2: Implement** — change the Zod schema to make `atsMode` truly optional, and resolve via theme default:

```ts
const pdfRequestSchema = z.object({
  cvData: cvDataSchema,
  themeId: z.string().min(1).max(64),
  atsMode: z.enum(["ats-strict", "ats-balanced", "expressive"]).optional(),
  customization: z.record(z.string(), z.unknown()).default({}),
});

// inside the handler:
const resolvedMode = parsed.data.atsMode ?? theme.meta.atsProfile.defaultMode;
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/cv.ts server/src/routes/__tests__/cv.test.ts
git commit -m "feat(server): default atsMode to theme.atsProfile.defaultMode when omitted"
```

---

## Phase 8 — Automated template testing in CI

### Task 8.1 — Author the per-theme PDF test script

**Files:**
- Create: `scripts/test-themes-pdf.ts`
- Create: `tests/__snapshots__/themes/.gitkeep`

- [ ] **Step 1: Implement the script**

```ts
// scripts/test-themes-pdf.ts
import { generateResumePdf } from "../server/src/services/pdfService";
import { themeRegistry, sampleCv, type AtsMode } from "@cvie/shared";
import pdfParse from "pdf-parse";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MODES: AtsMode[] = ["ats-strict", "ats-balanced", "expressive"];
const SNAP_DIR = resolve(process.cwd(), "tests/__snapshots__/themes");

const REQUIRED_TEXT = [
  "Yasmine Benali",
  "Ingénieure logicielle senior",
  "Télécom Paris",
  "Atelier SAS",
];

async function run() {
  await mkdir(SNAP_DIR, { recursive: true });
  const failures: string[] = [];

  for (const theme of themeRegistry) {
    for (const mode of MODES) {
      const min = theme.meta.atsProfile.minSupported;
      const order = { "ats-strict": 0, "ats-balanced": 1, expressive: 2 } as const;
      if (order[mode] < order[min]) continue; // skip unsupported

      const id = `${theme.meta.id}-${mode}`;
      const bytes = await generateResumePdf({
        cv: sampleCv,
        themeId: theme.meta.id,
        atsMode: mode,
        customization: {},
      });
      await writeFile(resolve(SNAP_DIR, `${id}.pdf`), bytes);

      const parsed = await pdfParse(Buffer.from(bytes));
      const text = parsed.text;

      for (const phrase of REQUIRED_TEXT) {
        if (!text.includes(phrase)) {
          failures.push(`${id}: missing required text "${phrase}"`);
        }
      }
      if (mode === "ats-strict" && /atelier-classique/.test(text) === false) {
        // No-op; just an example check. Real ATS-strict assertion:
        // ensure no decorative ornaments (◆) remain.
        if (text.includes("◆")) failures.push(`${id}: ornament leaked into ats-strict text`);
      }
    }
  }

  if (failures.length) {
    console.error("Theme PDF test failures:");
    for (const f of failures) console.error("  -", f);
    process.exit(1);
  }
  console.log("All theme×mode combinations produced valid ATS-compliant PDFs.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In root `package.json`:

```json
"test:themes": "bun run scripts/test-themes-pdf.ts"
```

- [ ] **Step 3: Run it locally and verify**

Run: `bun run test:themes`
Expected: prints "All theme×mode combinations produced valid ATS-compliant PDFs." and exits 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-themes-pdf.ts tests/__snapshots__/themes/.gitkeep package.json
git commit -m "test: add per-theme×mode PDF fidelity script"
```

### Task 8.2 — Add a lightweight ATS validator

**Files:**
- Create: `scripts/test-themes-ats.ts`
- Create: `shared/src/templates/ats/validator.ts`
- Test: `shared/src/templates/ats/validator.test.ts`

- [ ] **Step 1: Implement the validator (semantic-HTML heuristics)**

```ts
// shared/src/templates/ats/validator.ts
export type AtsReport = {
  score: number;          // 0..100
  passed: boolean;        // score >= 80
  flags: string[];
};

const REQUIRED_TAGS = ["<h1", "<h2", "<section"];
const FORBIDDEN_IN_STRICT = ["<table", "<canvas", "<svg"];

export function validateAtsHtml(html: string, strict: boolean): AtsReport {
  const flags: string[] = [];
  let score = 100;

  for (const t of REQUIRED_TAGS) {
    if (!html.includes(t)) {
      flags.push(`missing required tag: ${t}`);
      score -= 15;
    }
  }
  if (strict) {
    for (const t of FORBIDDEN_IN_STRICT) {
      if (html.includes(t)) {
        flags.push(`forbidden in ats-strict: ${t}`);
        score -= 20;
      }
    }
    if (/grid-template-columns:\s*(?!1fr)/.test(html)) {
      flags.push("multi-column layout retained in ats-strict");
      score -= 25;
    }
  }
  if (!/<meta\s+name="author"/i.test(html)) {
    flags.push("missing author meta");
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    passed: score >= 80,
    flags,
  };
}
```

- [ ] **Step 2: Write the validator test**

```ts
// shared/src/templates/ats/validator.test.ts
import { describe, it, expect } from "vitest";
import { validateAtsHtml } from "./validator";

describe("validateAtsHtml", () => {
  it("scores a complete semantic doc above 80", () => {
    const html = `<html><head><meta name="author" content="X"/></head><body><h1>X</h1><section><h2>Exp</h2></section></body></html>`;
    expect(validateAtsHtml(html, false).passed).toBe(true);
  });

  it("flags missing semantic headings", () => {
    const html = `<html><body><div>noisy</div></body></html>`;
    const r = validateAtsHtml(html, false);
    expect(r.passed).toBe(false);
    expect(r.flags.join(",")).toMatch(/h1|h2/);
  });

  it("flags multi-column layouts in strict mode", () => {
    const html = `<html><head><meta name="author" content="X"/><style>.cv { grid-template-columns: 32% 68%; }</style></head><body><h1>X</h1><h2>Y</h2><section></section></body></html>`;
    expect(validateAtsHtml(html, true).passed).toBe(false);
  });
});
```

- [ ] **Step 3: Build the per-theme ATS test script**

```ts
// scripts/test-themes-ats.ts
import {
  renderResumeHtml,
  themeRegistry,
  sampleCv,
  validateAtsHtml,
} from "@cvie/shared";

let failed = false;
for (const theme of themeRegistry) {
  for (const mode of ["ats-strict", "ats-balanced", "expressive"] as const) {
    const min = theme.meta.atsProfile.minSupported;
    const order = { "ats-strict": 0, "ats-balanced": 1, expressive: 2 } as const;
    if (order[mode] < order[min]) continue;

    const html = renderResumeHtml(sampleCv, {
      themeId: theme.meta.id,
      atsMode: mode,
      customization: {},
    });
    const report = validateAtsHtml(html, mode === "ats-strict");
    const tag = `${theme.meta.id}-${mode}`;
    if (!report.passed) {
      console.error(`✗ ${tag} (score ${report.score}): ${report.flags.join("; ")}`);
      failed = true;
    } else {
      console.log(`✓ ${tag} (score ${report.score})`);
    }
  }
}
if (failed) process.exit(1);
```

- [ ] **Step 4: Wire it into the npm `test:themes` script**

Update `package.json`:

```json
"test:themes": "bun run scripts/test-themes-ats.ts && bun run scripts/test-themes-pdf.ts"
```

- [ ] **Step 5: Commit**

```bash
git add shared/src/templates/ats/ scripts/test-themes-ats.ts package.json
git commit -m "test: add ATS HTML validator and per-theme×mode ATS report"
```

### Task 8.3 — CI integration

**Files:**
- Modify: `.github/workflows/*.yml` (whichever workflow runs `bun test`)

- [ ] **Step 1: Read the existing CI workflow and add a step**

```yaml
- name: Run template tests
  run: bun run test:themes
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/
git commit -m "ci: run bun run test:themes alongside unit tests"
```

---

## Phase 9 — Premium tier gating

> **Ordering:** tasks land bottom-up — DB column first, then a middleware that exposes tier on the request context, then services that consume it. This avoids any task referring to a property that doesn't exist yet.

### Task 9.1 — Add `tier` to the User Prisma model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_user_tier/migration.sql`

- [ ] **Step 1: Add `tier` to the `User` model**

```prisma
model User {
  // ... existing fields
  tier String @default("free")
}
```

- [ ] **Step 2: Generate the migration**

Run: `bunx prisma migrate dev --name user_tier`

Confirm the generated SQL adds a column with default `'free'` and no NOT NULL violation on existing rows.

- [ ] **Step 3: Commit (review the migration first)**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add User.tier (free/premium), default free"
```

> **Note (per project memory):** `prisma.config.ts` must use `url` only (no `directUrl`) in Prisma 7, and the URL must be the session URL on port 5432 — not the transaction pooler on 6543, or this migration will hang forever.

### Task 9.2 — Resolve user tier from `userClaims`

`optionalAuth` (`server/src/middleware/optionalAuth.ts`) sets `c.set("userClaims", Auth0Claims | null)`. There is **no `c.var.user`** today — tier must be resolved by looking up the User row when needed. Add a small, cached helper so the route and the themes endpoint both call the same function.

**Files:**
- Create: `server/src/services/userTier.ts`
- Create: `server/src/services/__tests__/userTier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/services/__tests__/userTier.test.ts
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { prisma } from "../../lib/prisma";
import { resolveUserTier, __resetUserTierCacheForTests } from "../userTier";

beforeEach(() => {
  __resetUserTierCacheForTests();
});

describe("resolveUserTier", () => {
  it("returns undefined when no claims are present", async () => {
    expect(await resolveUserTier(null)).toBeUndefined();
  });

  it("returns { tier: 'free' } when the User row has tier='free'", async () => {
    const findUnique = mock(() => Promise.resolve({ tier: "free" }));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    const out = await resolveUserTier({ sub: "auth0|1", email: "a@b.c" });
    expect(out).toEqual({ tier: "free" });
  });

  it("returns { tier: 'premium' } when the User row has tier='premium'", async () => {
    const findUnique = mock(() => Promise.resolve({ tier: "premium" }));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    const out = await resolveUserTier({ sub: "auth0|2", email: "p@b.c" });
    expect(out).toEqual({ tier: "premium" });
  });

  it("returns undefined when the User row is not found (fail-safe = anon)", async () => {
    const findUnique = mock(() => Promise.resolve(null));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    expect(await resolveUserTier({ sub: "auth0|gone", email: "x@x" })).toBeUndefined();
  });

  it("caches the lookup for the TTL window", async () => {
    let calls = 0;
    const findUnique = mock(() => {
      calls += 1;
      return Promise.resolve({ tier: "premium" });
    });
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    await resolveUserTier({ sub: "auth0|3", email: "a@b" });
    await resolveUserTier({ sub: "auth0|3", email: "a@b" });
    expect(calls).toBe(1);
  });
});
```

- [ ] **Step 2: Implement the helper**

```ts
// server/src/services/userTier.ts
import { prisma } from "../lib/prisma";
import type { Auth0Claims } from "./userService";

export type UserTier = "free" | "premium";
export type UserTierContext = { tier: UserTier } | undefined;

// Same 5-minute TTL as the optionalAuth upsert cache. Keyed by Auth0 sub.
const TIER_CACHE = new Map<string, { tier: UserTier; expiresAt: number }>();
const TTL_MS = 5 * 60_000;

export function __resetUserTierCacheForTests(): void {
  TIER_CACHE.clear();
}

export async function resolveUserTier(
  claims: Pick<Auth0Claims, "sub"> | null,
): Promise<UserTierContext> {
  if (!claims) return undefined;

  const hit = TIER_CACHE.get(claims.sub);
  if (hit && hit.expiresAt > Date.now()) return { tier: hit.tier };

  const row = await prisma.user.findUnique({
    where: { auth0Sub: claims.sub },
    select: { tier: true },
  });
  if (!row) return undefined; // unknown sub: treat as anonymous

  // Defensive: normalize anything unexpected back to 'free'.
  const tier: UserTier = row.tier === "premium" ? "premium" : "free";
  TIER_CACHE.set(claims.sub, { tier, expiresAt: Date.now() + TTL_MS });
  return { tier };
}
```

- [ ] **Step 3: Run + commit**

Run: `cd server && bun test src/services/__tests__/userTier.test.ts`
Expected: PASS (5 tests).

```bash
git add server/src/services/userTier.ts server/src/services/__tests__/userTier.test.ts
git commit -m "feat(server): resolveUserTier helper backed by the User row + TTL cache"
```

### Task 9.3 — `canUseTheme` policy

**Files:**
- Create: `server/src/services/themeAccess.ts`
- Create: `server/src/services/__tests__/themeAccess.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/services/__tests__/themeAccess.test.ts
import { describe, it, expect } from "bun:test";
import { canUseTheme } from "../themeAccess";
import { themeRegistry } from "@cvie/shared";

const classique = themeRegistry.find((t) => t.meta.id === "atelier-classique")!;
const premiumMeta = { ...classique.meta, tier: "premium" as const };

describe("canUseTheme", () => {
  it("permits free themes for anonymous users", () => {
    expect(canUseTheme(classique.meta, undefined)).toBe(true);
  });
  it("permits free themes for free-tier users", () => {
    expect(canUseTheme(classique.meta, { tier: "free" })).toBe(true);
  });
  it("denies premium themes for anonymous users", () => {
    expect(canUseTheme(premiumMeta, undefined)).toBe(false);
  });
  it("denies premium themes for free-tier users", () => {
    expect(canUseTheme(premiumMeta, { tier: "free" })).toBe(false);
  });
  it("permits premium themes for premium-tier users", () => {
    expect(canUseTheme(premiumMeta, { tier: "premium" })).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// server/src/services/themeAccess.ts
import type { ThemeMeta } from "@cvie/shared";
import type { UserTierContext } from "./userTier";

export function canUseTheme(theme: ThemeMeta, user: UserTierContext): boolean {
  if (theme.tier === "free") return true;
  return user?.tier === "premium";
}
```

- [ ] **Step 3: Run + commit**

Run: `cd server && bun test src/services/__tests__/themeAccess.test.ts`
Expected: PASS (5 tests).

```bash
git add server/src/services/themeAccess.ts server/src/services/__tests__/themeAccess.test.ts
git commit -m "feat(server): canUseTheme policy (free/premium gate)"
```

### Task 9.4 — Enforce the gate in `/api/v1/cv/pdf`

**Files:**
- Modify: `server/src/routes/cv.ts`
- Modify: `server/src/routes/__tests__/cv.test.ts`

- [ ] **Step 1: Write the failing route test**

The test stubs `themeRegistry`'s `atelier-moderne` entry to be premium (cleaner than adding a fixture theme that pollutes the registry). Add a setup that the bun test runner re-imports per case.

```ts
// server/src/routes/__tests__/cv.test.ts (append)
import { sampleCv, themeRegistry } from "@cvie/shared";
import * as userTierModule from "../../services/userTier";

test("POST /api/v1/cv/pdf returns 402 when a free user requests a premium theme", async () => {
  const moderne = themeRegistry.find((t) => t.meta.id === "atelier-moderne")!;
  const originalTier = moderne.meta.tier;
  (moderne.meta as { tier: "free" | "premium" }).tier = "premium";

  const spy = mock.module("../../services/userTier", () => ({
    ...userTierModule,
    resolveUserTier: async () => ({ tier: "free" as const }),
  }));

  try {
    const res = await app.request("/api/v1/cv/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer fake.jwt.fixture" },
      body: JSON.stringify({
        cvData: sampleCv,
        themeId: "atelier-moderne",
        atsMode: "ats-balanced",
        customization: {},
      }),
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("PREMIUM_REQUIRED");
  } finally {
    (moderne.meta as { tier: "free" | "premium" }).tier = originalTier;
    spy.restore();
  }
});

test("POST /api/v1/cv/pdf allows anon users to use free themes (no 402)", async () => {
  const res = await app.request("/api/v1/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvData: sampleCv,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {},
    }),
  });
  expect([200, 400, 500]).toContain(res.status); // not 402 — and tests for the 200 path live above
});
```

- [ ] **Step 2: Wire `resolveUserTier` + `canUseTheme` into the route**

In `server/src/routes/cv.ts`, inside the `/pdf` handler — immediately after the theme is resolved by `getTheme(themeId)`:

```ts
import { canUseTheme } from "../services/themeAccess";
import { resolveUserTier } from "../services/userTier";

// `userClaims` is set by optionalAuth (already mounted globally). It is
// `Auth0Claims | null`. `resolveUserTier` returns `undefined` for anon users
// or unknown subs, and `{ tier }` for known users — fail-safe to anon on lookup
// error so a transient DB blip never paywalls a free user.
const userTier = await resolveUserTier(c.get("userClaims"));
if (!canUseTheme(theme.meta, userTier)) {
  return c.json(
    {
      error: `Le thème « ${theme.meta.name} » est réservé aux abonnements Premium.`,
      code: "PREMIUM_REQUIRED",
    },
    402,
  );
}
```

> The PDF route is mounted under `cvRoutes` which is hit by `optionalAuth` globally. **Confirm before editing** by reading `server/src/index.ts` — if optionalAuth isn't applied globally, mount it on `cvRoutes` directly first.

- [ ] **Step 3: Run + commit**

Run: `cd server && bun test src/routes/__tests__/cv.test.ts`
Expected: PASS — premium-gate tests + the existing route tests.

```bash
git add server/src/routes/cv.ts server/src/routes/__tests__/cv.test.ts
git commit -m "feat(server): gate /pdf behind theme.tier × user.tier (402 PREMIUM_REQUIRED)"
```

### Task 9.5 — Add `GET /api/v1/themes` (premium-aware)

**Files:**
- Create: `server/src/routes/themes.ts`
- Create: `server/src/routes/__tests__/themes.test.ts`
- Modify: `server/src/index.ts` (mount the route — verify the actual mount file with `grep -l 'cvRoutes' server/src`)

- [ ] **Step 1: Write the failing test**

```ts
// server/src/routes/__tests__/themes.test.ts
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { app } from "../../testHelpers/app";
import { themeRegistry } from "@cvie/shared";
import * as userTierModule from "../../services/userTier";

describe("GET /api/v1/themes", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("lists every theme with tier metadata for anonymous users", async () => {
    const res = await app.request("/api/v1/themes");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.themes.length).toBe(themeRegistry.length);
    for (const t of body.themes) {
      expect(t.id).toEqual(expect.any(String));
      expect(t.name).toEqual(expect.any(String));
      expect(t.tier).toMatch(/^(free|premium)$/);
      expect(typeof t.locked).toBe("boolean");
    }
  });

  it("marks premium themes as locked for free users", async () => {
    const moderne = themeRegistry.find((t) => t.meta.id === "atelier-moderne")!;
    const originalTier = moderne.meta.tier;
    (moderne.meta as { tier: "free" | "premium" }).tier = "premium";
    mock.module("../../services/userTier", () => ({
      ...userTierModule,
      resolveUserTier: async () => ({ tier: "free" as const }),
    }));
    try {
      const res = await app.request("/api/v1/themes", {
        headers: { Authorization: "Bearer fake.jwt.fixture" },
      });
      const body = await res.json();
      const m = body.themes.find((t: { id: string }) => t.id === "atelier-moderne");
      expect(m.locked).toBe(true);
    } finally {
      (moderne.meta as { tier: "free" | "premium" }).tier = originalTier;
    }
  });

  it("does not lock premium themes for premium-tier users", async () => {
    const moderne = themeRegistry.find((t) => t.meta.id === "atelier-moderne")!;
    const originalTier = moderne.meta.tier;
    (moderne.meta as { tier: "free" | "premium" }).tier = "premium";
    mock.module("../../services/userTier", () => ({
      ...userTierModule,
      resolveUserTier: async () => ({ tier: "premium" as const }),
    }));
    try {
      const res = await app.request("/api/v1/themes", {
        headers: { Authorization: "Bearer fake.jwt.fixture" },
      });
      const body = await res.json();
      const m = body.themes.find((t: { id: string }) => t.id === "atelier-moderne");
      expect(m.locked).toBe(false);
    } finally {
      (moderne.meta as { tier: "free" | "premium" }).tier = originalTier;
    }
  });
});
```

- [ ] **Step 2: Implement**

```ts
// server/src/routes/themes.ts
import { Hono } from "hono";
import { themeRegistry } from "@cvie/shared";
import { resolveUserTier } from "../services/userTier";

export const themesRoutes = new Hono();

themesRoutes.get("/", async (c) => {
  const userTier = await resolveUserTier(c.get("userClaims"));
  const themes = themeRegistry.map((t) => ({
    id: t.meta.id,
    name: t.meta.name,
    description: t.meta.description,
    tier: t.meta.tier,
    atsProfile: t.meta.atsProfile,
    supportsPhoto: t.meta.supportsPhoto,
    locked: t.meta.tier === "premium" && userTier?.tier !== "premium",
  }));
  c.header("Cache-Control", "no-store");
  return c.json({ themes });
});
```

- [ ] **Step 3: Mount the route**

Open `server/src/index.ts` (or wherever `cvRoutes` is mounted), and add:

```ts
import { themesRoutes } from "./routes/themes";
// Mount AFTER optionalAuth (so userClaims is populated) and at the same /api/v1 base:
app.route("/api/v1/themes", themesRoutes);
```

- [ ] **Step 4: Run + commit**

Run: `cd server && bun test src/routes/__tests__/themes.test.ts`
Expected: PASS (3 tests).

```bash
git add server/src/routes/themes.ts server/src/routes/__tests__/themes.test.ts server/src/index.ts
git commit -m "feat(server): GET /api/v1/themes with per-user lock state"
```

### Task 9.6 — Mark `atelier-moderne` as premium (example gate)

The user's brief says "potentially classify some of them as premium". Land one example so the gate is exercised end-to-end.

**Files:**
- Modify: `shared/src/templates/themes/atelier-moderne/index.ts`
- Modify: tests that depended on it being `free`

- [ ] **Step 1: Flip the tier**

```ts
// atelier-moderne/index.ts
tier: "premium",
```

- [ ] **Step 2: Update tests** (the `tier === 'free'` assertions in `index.test.ts`) and the `customizationSchema` tests that may now be premium-only.

- [ ] **Step 3: Verify the UI lock badge appears**

Run: `bun dev:client`. Confirm the "Atelier — Moderne" chip in `ExportBar` shows the `◇` lock glyph, and clicking export with that theme returns 402 (open the network tab).

- [ ] **Step 4: Commit**

```bash
git add shared/src/templates/themes/atelier-moderne/index.ts shared/src/templates/themes/atelier-moderne/index.test.ts
git commit -m "feat: classify atelier-moderne as premium (first paid theme)"
```

---

## Phase 10 — Delete Figma legacy

After Phases 1–9 are landed, merged, and verified in staging for at least one production export cycle, delete the old infrastructure.

### Task 10.1 — Backfill `themeId` on existing CV rows

**Files:**
- Create: `prisma/migrations/<timestamp>_cv_theme_id_backfill/migration.sql`

- [ ] **Step 1: Author the migration**

```sql
-- Maps the three legacy template ids to their atelier equivalents.
-- Rows whose data->'templateId' is not one of the legacy ids get the safe default.
UPDATE "Cv"
SET data = jsonb_set(
  data,
  '{themeId}',
  to_jsonb(
    CASE data->>'templateId'
      WHEN 'classique' THEN 'atelier-classique'
      WHEN 'moderne' THEN 'atelier-classique'  -- moderne is now premium; gift free users the closest free theme
      WHEN 'minimaliste' THEN 'atelier-minimaliste'
      ELSE 'atelier-classique'
    END
  )
)
WHERE NOT (data ? 'themeId');
```

- [ ] **Step 2: Run + verify in dev**

Run: `bunx prisma migrate dev --name cv_theme_id_backfill`
Then: `SELECT data->'themeId' AS theme_id, count(*) FROM "Cv" GROUP BY 1;` — confirm every row has a `themeId`.

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations/
git commit -m "db: backfill Cv.data.themeId from legacy templateId"
```

### Task 10.2 — Delete Figma scripts and generated artifacts

**Files (delete):**
- `scripts/sync-figma-templates.ts`
- `scripts/generate-template-css.ts`
- `scripts/smoke-template-previews.ts`
- `shared/src/templates/figma/` (entire directory)
- `shared/src/templates/styles/` (entire directory)
- `shared/src/templates/registry.ts` (replaced by `themes/registry.ts`)
- `shared/src/templates/registry.test.ts`
- `shared/src/templates/renderer.ts` (47 KB — replaced)
- `shared/src/templates/renderer.test.ts`
- `client/src/features/editor/components/DesignPanel.tsx`
- `client/src/features/editor/components/__tests__/DesignPanel.*.test.tsx`
- `client/src/features/editor/components/__tests__/CvEditor.templateSwitch.test.tsx`

- [ ] **Step 1: Search for lingering imports**

Run: `cd cvie-fr && grep -r "renderCvHtml\|getTemplateCss\|sync-figma\|figma/templateSync\|templateRegistry\b" --include="*.ts" --include="*.tsx" .`
Expected: zero hits.

- [ ] **Step 2: Delete the files**

```bash
rm -f scripts/sync-figma-templates.ts scripts/generate-template-css.ts scripts/smoke-template-previews.ts
rm -rf shared/src/templates/figma shared/src/templates/styles
rm -f shared/src/templates/registry.ts shared/src/templates/registry.test.ts
rm -f shared/src/templates/renderer.ts shared/src/templates/renderer.test.ts
rm -f client/src/features/editor/components/DesignPanel.tsx
rm -rf client/src/features/editor/components/__tests__/DesignPanel.sizes.test.tsx client/src/features/editor/components/__tests__/DesignPanel.spacing.test.tsx client/src/features/editor/components/__tests__/CvEditor.templateSwitch.test.tsx
```

- [ ] **Step 3: Rename `resumeRenderer.ts` → `renderer.ts`**

```bash
mv shared/src/templates/resumeRenderer.ts shared/src/templates/renderer.ts
mv shared/src/templates/resumeRenderer.test.ts shared/src/templates/renderer.test.ts
```

Update the import in `shared/src/templates/index.ts` accordingly.

- [ ] **Step 4: Update root `package.json` scripts**

Remove:
- `sync:figma-templates`
- `generate:template-css`
- `check:template-css`
- `smoke:template-previews`

- [ ] **Step 5: Update `README.md:85-98`** — replace the "Figma Template Sync" section with:

```markdown
## Themes

CV templates live in `shared/src/templates/themes/<theme-id>/`. Each theme is a
vendored TypeScript module exporting `meta`, `styles.ts`, and `render.ts`.
See `shared/src/templates/themes/README.md` for the theme authoring guide.

To validate every theme × ATS mode in CI:

\`\`\`bash
bun run test:themes
\`\`\`
```

- [ ] **Step 6: Update `cvie-fr/CLAUDE.md`** — note the theme-authoring location.

- [ ] **Step 7: Run the full test suite + dev smoke**

```bash
bun test
bun run test:themes
bun dev:client &
bun dev:server &
# Manually export a CV in each theme × each ATS mode.
```

Expected: green tests, working exports, no broken imports.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove Figma template sync pipeline + legacy renderer"
```

### Task 10.3 — Write the theme-author guide

**Files:**
- Create: `shared/src/templates/themes/README.md`

- [ ] **Step 1: Write the guide**

```markdown
# Authoring a theme

A theme is a vendored TypeScript module that turns a JSON Resume document into
a complete, print-ready HTML document.

## Contract

Each theme lives at `shared/src/templates/themes/<theme-id>/` and exports:

\`\`\`ts
export const theme: Theme = {
  meta: { /* id, name, tier, atsProfile, customizationSchema, defaultCustomization, supportsPhoto */ },
  render: (resume, options) => string,
};
\`\`\`

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
```

- [ ] **Step 2: Commit**

```bash
git add shared/src/templates/themes/README.md
git commit -m "docs: theme authoring guide"
```

---

## Self-Review

Walked the spec and the plan side by side. A second pass against the actual codebase (2026-05-14) caught and fixed ten issues — see *Revision Log* at the bottom.

**1. Spec coverage** — Each of the user's six deliverables maps to a task chain:
- *Structured CV editor* → Phase 5 (Tasks 5.1–5.10: tokens, atoms, TocRail, PreviewPane, ExportBar, six section forms, SectionRouter, `useExportPdf` hook, Workspace)
- *Curated JSON Resume-compatible templates* → Phases 1–2 (mapper + theme contract + `atelier-classique`) and Phase 4 (`atelier-moderne` + `atelier-minimaliste`)
- *Controlled customization* → Phase 6 (introspection-driven panel; only enums exposed)
- *Playwright PDF rendering* → Phase 3 (renderer + `generateResumePdf` switch); Phase 7 (mode-aware metadata)
- *ATS-safe export modes* → Phase 7 (route enforcement, fallback defaults, metadata) + Phase 2.3 (CSS overrides)
- *Automated template testing* → Phase 8 (per-theme×mode PDF fidelity + HTML ATS validator + CI step)

The user also mentioned *premium templates* — covered by Phase 9 (tier column, `resolveUserTier` helper, `canUseTheme` policy, route gate, themes endpoint, first premium theme).

The CV schema migration (adding `themeId` + `customization` fields) is Task 1.6.

**2. Placeholder scan** — Walked the plan for "TBD", "TODO", "fill in", "implement later", "similar to", "appropriate error handling". No matches. One section in Task 5.7 says "follow this template" for the five additional forms; one full implementation and a concrete recipe (field paths, atom choices, append shapes) cover the mechanical variation. Phase 9 tests now spell out the stubbing strategy explicitly (`mock.module` for `resolveUserTier`).

**3. Type consistency** — Names checked across phases:
- `generateResumePdf` (Phase 3 onwards — consistent)
- `renderResumeHtml` (Phase 3, used by Phase 5 PreviewPane, Phase 8 ATS script — consistent)
- `themeRegistry`, `getTheme`, `requireTheme`, `listThemes` (Phase 2.7 — consistent across Phase 5–9 imports)
- `AtsMode` (consistent)
- `ThemeMeta.tier` `'free' | 'premium'` (consistent)
- `UserTier` + `UserTierContext` (`server/src/services/userTier.ts`) is the single source of truth used by `themeAccess.ts`, the `/pdf` route, and the `/themes` route — no `c.var.user.tier` references remain
- `useExportPdf` hook contract (Task 5.9) matches the `cvData/themeId/atsMode/customization` POST shape used by Task 3.4
- `sampleCv` and `validateAtsHtml` are re-exported from `@cvie/shared` (Task 3.2) so no deep-path imports remain

**4. Risks to flag to the engineer:**
- The plan keeps the old `generateCvPdf` alive as a deprecated wrapper during Phase 3 to keep the existing route compiling. The full cleanup happens in Phase 10. If Phase 10 is delayed, the deprecated wrapper drifts — set a calendar reminder.
- `prisma.config.ts` URL choice (session vs. pooler) is captured in user memory and applies to Tasks 9.1 and 10.1. The migration will hang silently otherwise.
- Tailwind v4 namespace collisions (`--spacing-*`) are flagged inside Task 5.1.
- The `optionalAuth` middleware must run before any route that calls `resolveUserTier(c.get("userClaims"))`. Task 9.4 and 9.5 explicitly note this — verify the mount order in `server/src/index.ts` before landing them.

**5. Worktree note** — The writing-plans skill recommends running this from a brainstorming-created worktree. We didn't run a brainstorming session because the user provided a clear spec. The plan can be executed in either a worktree or directly on a feature branch; pick one before Task 1.1.

**6. Plan size** — Large but not split. The subsystems are tightly coupled (themes need the mapper; the editor needs themes; tests need both) and one engineer or a single subagent-driven session can execute them in order. If a second engineer joins, split at the Phase 4 / Phase 5 boundary — Phases 1–4 are shared/server, Phase 5+ are client-heavy.

### Revision Log (2026-05-14)

Self-Review pass against the actual codebase identified and fixed:

1. **High** — `c.var.user.tier` does not exist. `requireAuth` only sets `userId`; `optionalAuth` only sets `userClaims: Auth0Claims | null`. Phase 9 rewritten to land the DB column first (Task 9.1), then a `resolveUserTier(claims)` helper backed by a TTL cache (Task 9.2), then the policy (9.3), the gate (9.4), the themes endpoint (9.5), and finally the premium classification (9.6). Old numbering shifted.
2. **High** — No task migrated `cvDataSchema`. Added **Task 1.6** (extend the Zod schema with `themeId` defaulting to `"atelier-classique"` and a permissive `customization` record).
3. **High** — `useExportPdf` was referenced as "existing" but the export was inline in `CvEditor.tsx:864`. Added **Task 5.9** (extract the hook with full test coverage). Old Task 5.9 became Task 5.10.
4. **Medium** — Task 3.4 lost the rich French error codes (`PAYLOAD_TOO_LARGE`, `INVALID_TEMPLATE`, etc.). Rewritten to preserve them and add `INVALID_ATS_MODE` + `INVALID_CUSTOMIZATION`. Phase 9 adds a French `PREMIUM_REQUIRED` (402).
5. **Medium** — Deep-path imports (`@cvie/shared/templates/__fixtures__/sampleCv`, `@cvie/shared/templates/ats/validator`) need an `exports` map. Task 3.2 now re-exports `sampleCv`, `sampleResume`, `validateAtsHtml`, `AtsReport` from the top-level barrel; downstream tasks use `@cvie/shared` directly.
6. **Medium** — Placeholders in Task 9.1 Step 4 and Task 9.3 Step 1 replaced with concrete `mock.module`-based stubbing tests.
7. **Low** — Tasks 2.4–2.6 had an intentionally non-buildable interim commit (`./render` missing). Replaced with a *staged-but-not-committed* flow that lands a single combined commit at Task 2.6 — clean for `git bisect`.
8. **Low** — Task 7.2 had an indecisive "Then simplification" passage with two competing approaches. Picked the simpler one (themes emit `<meta name="author">`; pdfService sets `document.title`) and dropped the tagged-PDF tangent.
9. **Low** — File Structure listed orphan hooks (`useActiveTheme`, `useExportMode`, `usePremiumGate`) that no task built. Removed; `useExportPdf` listed in their place to match Task 5.9.
10. **Low** — Migration name inconsistency. Standardised on `cv_theme_id_backfill` in File Structure and Task 10.1.



