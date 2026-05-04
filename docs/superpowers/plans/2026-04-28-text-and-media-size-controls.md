# Per-Type Text & Media Size Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Design-tab controls that let users grow or shrink CV text per typographic role (paragraph / header / title) and resize header media (photo + QR) independently of the global density slider.

**Architecture:** Extend `appearanceSchema` with `textSizes` (per-role pt deltas) and `mediaSize` (mm delta). Introduce a role-aware scale helper that emits `calc(<base> * var(--cv-scale, 1) + var(--cv-<role>-delta, 0pt))`. Renderer injects the deltas as inline CSS custom properties on `<html>` (mirrors how `--cv-scale` and palette overrides ship today). Live preview updates ride the existing `postMessage` bridge that already feeds the iframe `cv-scale`. The Figma-synced base font sizes remain the canonical defaults — deltas are purely additive.

**Tech Stack:** React + react-hook-form + Zod (schemas), TypeScript, Vitest (tests), CSS calc() with custom properties, postMessage bridge for iframe live updates.

**Aesthetic note (frontend-design):** Match the existing DesignPanel's refined-editorial French aesthetic — hairline borders, `font-mono-caps` tracking-letterspacing labels, `var(--color-ink)` ink, divided list rows. Use native `<input type="range">` with custom CSS thumbs; no third-party slider libs. Each row: role label + hint, range track, tabular-num value badge, optional reset arrow. Group all five sliders into one "Tailles" card matching the "Couleurs du modèle" card already on the panel — same border treatment, same `border-[var(--color-rule)]`, same `bg-white/75`.

---

## File Structure

**Create:**
- `cvie-fr/shared/src/templates/styles/__tests__/scaled.test.ts` — unit tests for new helpers (alongside existing `_scaled.ts`).
- `cvie-fr/client/src/features/editor/components/__tests__/DesignPanel.sizes.test.tsx` — UI tests for the new sliders.

**Modify:**
- `cvie-fr/shared/src/schemas/cv.ts` — extend `appearanceSchema` with `textSizes` + `mediaSize`.
- `cvie-fr/shared/src/types/cv.ts` — re-export new derived type.
- `cvie-fr/shared/src/templates/styles/_scaled.ts` — add `sText()` and `sMedia()` role-aware helpers.
- `cvie-fr/shared/src/templates/styles/classique.ts` — classify text rules into roles, swap `s()` for `sText()`/`sMedia()` where appropriate.
- `cvie-fr/shared/src/templates/styles/moderne.ts` — same as classique.
- `cvie-fr/shared/src/templates/styles/minimaliste.ts` — same as classique.
- `cvie-fr/shared/src/templates/renderer.ts` — emit `--cv-text-*-delta` and `--cv-media-delta` on `<html style>`; clamp at render time; extend pagination script's postMessage handler to accept new delta messages.
- `cvie-fr/shared/src/templates/renderer.test.ts` — assertions on CSS-var emission.
- `cvie-fr/client/src/features/editor/components/EditorPreviewPane.tsx` — post text + media deltas to iframe (like `cv-scale` is posted today).
- `cvie-fr/client/src/features/editor/components/DesignPanel.tsx` — append "Tailles" section with five sliders + global reset for sizes.

**Why this split:** Templates change together (same font-size classification pass per role), so they're three sibling tasks. Schema → helpers → templates → renderer → preview-pane → DesignPanel is the dependency chain; respect it during execution.

---

## Roles, Defaults, Slider Ranges

| Role        | Affects                                     | Unit | Range  | Step | Default |
|-------------|---------------------------------------------|------|--------|------|---------|
| `paragraph` | body text, list items, descriptions, meta   | pt   | -3..+5 | 0.5  | 0       |
| `header`    | section h2, entry h3, jobTitle, contact     | pt   | -3..+5 | 0.5  | 0       |
| `title`     | name h1, summary in-header (display headline) | pt | -4..+6 | 0.5  | 0       |
| `media`     | header `.photo` + `.portfolio-qr-box`       | mm   | -8..+12| 0.5  | 0       |

The "title" range is a touch wider because the h1 has more visual room. All ranges chosen so that even at extremes the layout never collapses below readability or overflows a single A4 width.

**Role assignment per existing rule** (apply in template refactor tasks):
- `title`: `.cv header h1`, `.cv header .summary`
- `header`: `.cv section h2`, `.cv article h3`, `.cv header .job-title`, `.cv article .entry-meta`
- `paragraph`: everything else with a `font-size` (entry-sub, entry-description, list bullets, contact, skills, languages, interests, lang-level, skill-level, qr-label, ::marker rules, page-advisory)
- `media`: `.cv header .photo` width/height, `.cv .portfolio-qr-box` width/height (NOT padding/border which stay tied to the visual frame proportions — keep those on plain `s()`)

The classification table is the contract — stick to it across all three templates so user expectations are uniform.

---

## Task Breakdown

### Task 1: Schema — appearance.textSizes + mediaSize

**Files:**
- Modify: `cvie-fr/shared/src/schemas/cv.ts:175-178`
- Modify: `cvie-fr/shared/src/types/cv.ts` (no code change — types regenerate from schema)

- [ ] **Step 1: Write failing test for new schema fields**

Append to `cvie-fr/shared/src/cv/defaults.test.ts` (or create `cvie-fr/shared/src/schemas/cv.test.ts` if no schema test file exists yet — check first):

```ts
import { describe, expect, it } from "vitest";
import { appearanceSchema } from "./cv";

describe("appearanceSchema sizes", () => {
  it("accepts a fully populated textSizes + mediaSize", () => {
    const parsed = appearanceSchema.safeParse({
      textSizes: { paragraph: 1.5, header: 0, title: -2 },
      mediaSize: 4,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects textSizes outside the allowed range", () => {
    const parsed = appearanceSchema.safeParse({
      textSizes: { paragraph: 99 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects mediaSize outside the allowed range", () => {
    const parsed = appearanceSchema.safeParse({ mediaSize: 50 });
    expect(parsed.success).toBe(false);
  });

  it("treats sizes as optional (back-compat)", () => {
    const parsed = appearanceSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run --filter @cvie/shared test -- cv.test`
Expected: FAIL — `textSizes` / `mediaSize` not in schema.

- [ ] **Step 3: Extend the schema**

Replace lines 175–178 of `cvie-fr/shared/src/schemas/cv.ts`:

```ts
const textSizesSchema = z
  .object({
    paragraph: z.number().min(-3).max(5).optional(),
    header: z.number().min(-3).max(5).optional(),
    title: z.number().min(-4).max(6).optional(),
  })
  .optional();

const mediaSizeSchema = z.number().min(-8).max(12).optional();

export const appearanceSchema = z.object({
  palette: paletteSchema.optional(),
  locale: localeSchema.optional(),
  textSizes: textSizesSchema,
  mediaSize: mediaSizeSchema,
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run --filter @cvie/shared test`
Expected: all pass, including the new schema tests AND the existing `defaults.test.ts` (sample CVs must still validate — they don't set `textSizes`/`mediaSize`, optionality covers it).

- [ ] **Step 5: Commit**

```bash
git add cvie-fr/shared/src/schemas/cv.ts cvie-fr/shared/src/cv/defaults.test.ts
git commit -m "feat(shared): extend appearanceSchema with textSizes + mediaSize"
```

---

### Task 2: Scale helpers — sText() and sMedia()

**Files:**
- Modify: `cvie-fr/shared/src/templates/styles/_scaled.ts`
- Create: `cvie-fr/shared/src/templates/styles/__tests__/scaled.test.ts`

- [ ] **Step 1: Write failing tests for new helpers**

Create `cvie-fr/shared/src/templates/styles/__tests__/scaled.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { s, sText, sMedia } from "../_scaled";

describe("scale helpers", () => {
  it("s() emits density-only calc()", () => {
    expect(s(10, "pt")).toBe("calc(10pt * var(--cv-scale, 1))");
  });

  it("sText() adds a per-role delta term", () => {
    expect(sText(10, "pt", "paragraph")).toBe(
      "calc(10pt * var(--cv-scale, 1) + var(--cv-text-paragraph-delta, 0pt))",
    );
    expect(sText(24, "pt", "title")).toBe(
      "calc(24pt * var(--cv-scale, 1) + var(--cv-text-title-delta, 0pt))",
    );
    expect(sText(15, "pt", "header")).toBe(
      "calc(15pt * var(--cv-scale, 1) + var(--cv-text-header-delta, 0pt))",
    );
  });

  it("sMedia() adds the media delta term", () => {
    expect(sMedia(28, "mm")).toBe(
      "calc(28mm * var(--cv-scale, 1) + var(--cv-media-delta, 0mm))",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run --filter @cvie/shared test -- scaled.test`
Expected: FAIL — `sText` and `sMedia` not exported.

- [ ] **Step 3: Add the helpers**

Append to `cvie-fr/shared/src/templates/styles/_scaled.ts`:

```ts
export type TextRole = "paragraph" | "header" | "title";

/**
 * Scale a text length by both the global density (`--cv-scale`) AND a
 * per-role pt delta (`--cv-text-<role>-delta`, default `0pt`). The delta
 * lets users grow/shrink a single typographic role from the Design tab
 * without disturbing the rest of the document.
 *
 * Example:
 *   font-size: ${sText(10, "pt", "paragraph")};
 *   → calc(10pt * var(--cv-scale, 1) + var(--cv-text-paragraph-delta, 0pt))
 *
 * Use only on `font-size` declarations. Margins, line-heights, and
 * decorative widths should keep using `s()` so they don't drift away
 * from the surrounding rhythm when text grows.
 */
export function sText(value: number, unit: AbsoluteUnit, role: TextRole): string {
  return `calc(${value}${unit} * var(--cv-scale, 1) + var(--cv-text-${role}-delta, 0pt))`;
}

/**
 * Scale a media length (header photo, QR box) by density AND the user's
 * mm delta. Wraps the SAME width AND height of any media element — never
 * mix `sMedia()` for one axis and `s()` for the other; the photo/QR are
 * intentionally square and the delta would skew them.
 */
export function sMedia(value: number, unit: AbsoluteUnit): string {
  return `calc(${value}${unit} * var(--cv-scale, 1) + var(--cv-media-delta, 0mm))`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run --filter @cvie/shared test -- scaled.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cvie-fr/shared/src/templates/styles/_scaled.ts cvie-fr/shared/src/templates/styles/__tests__/scaled.test.ts
git commit -m "feat(shared): add sText/sMedia role-aware scale helpers"
```

---

### Task 3: Renderer — emit delta CSS vars + extend postMessage bridge

**Files:**
- Modify: `cvie-fr/shared/src/templates/renderer.ts:48-90` (`renderCvHtml`)
- Modify: `cvie-fr/shared/src/templates/renderer.ts:268-589` (`PAGINATION_SCRIPT`)
- Modify: `cvie-fr/shared/src/templates/renderer.test.ts`

- [ ] **Step 1: Write failing tests for delta emission**

Append to `cvie-fr/shared/src/templates/renderer.test.ts`:

```ts
describe("renderCvHtml — appearance.textSizes / mediaSize", () => {
  it("emits text-size delta CSS vars on <html> when set", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        appearance: {
          textSizes: { paragraph: 1, header: -0.5, title: 2 },
          mediaSize: 3,
        },
      },
      "classique",
    );
    expect(html).toContain("--cv-text-paragraph-delta: 1pt");
    expect(html).toContain("--cv-text-header-delta: -0.5pt");
    expect(html).toContain("--cv-text-title-delta: 2pt");
    expect(html).toContain("--cv-media-delta: 3mm");
  });

  it("omits delta vars when appearance is undefined", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).not.toContain("--cv-text-paragraph-delta");
    expect(html).not.toContain("--cv-media-delta");
  });

  it("clamps deltas defensively at render time", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        // @ts-expect-error — deliberately out-of-range to exercise clamp
        appearance: { textSizes: { paragraph: 999 }, mediaSize: 999 },
      },
      "classique",
    );
    // Clamp upper bound: paragraph max = 5pt, media max = 12mm
    expect(html).toContain("--cv-text-paragraph-delta: 5pt");
    expect(html).toContain("--cv-media-delta: 12mm");
  });
});
```

(Adjust the import/sampleCv reference to match the existing test file's pattern.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run --filter @cvie/shared test -- renderer.test`
Expected: FAIL — delta vars not emitted.

- [ ] **Step 3: Add a clamp helper + emission**

Add to `renderer.ts` near the existing `renderPaletteOverride()`:

```ts
const TEXT_SIZE_RANGES: Record<"paragraph" | "header" | "title", { min: number; max: number }> = {
  paragraph: { min: -3, max: 5 },
  header: { min: -3, max: 5 },
  title: { min: -4, max: 6 },
};
const MEDIA_SIZE_MIN = -8;
const MEDIA_SIZE_MAX = 12;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

/**
 * Build the inline `style` attribute payload for <html>. Combines the
 * density `--cv-scale` (always present) with optional per-role text
 * deltas and the media delta. Returns a single space-separated string of
 * `--var: value;` declarations suitable for direct interpolation.
 */
function renderRootStyle(
  scale: number,
  textSizes: { paragraph?: number; header?: number; title?: number } | undefined,
  mediaSize: number | undefined,
): string {
  const decls: string[] = [`--cv-scale: ${scale}`];
  if (textSizes) {
    for (const role of ["paragraph", "header", "title"] as const) {
      const raw = textSizes[role];
      if (typeof raw === "number") {
        const range = TEXT_SIZE_RANGES[role];
        decls.push(`--cv-text-${role}-delta: ${clampNumber(raw, range.min, range.max)}pt`);
      }
    }
  }
  if (typeof mediaSize === "number") {
    decls.push(`--cv-media-delta: ${clampNumber(mediaSize, MEDIA_SIZE_MIN, MEDIA_SIZE_MAX)}mm`);
  }
  return decls.join("; ");
}
```

Replace the `<html lang="fr" style="--cv-scale: ${safeScale}">` line with:

```ts
<html lang="fr" style="${renderRootStyle(safeScale, data.appearance?.textSizes, data.appearance?.mediaSize)}">
```

- [ ] **Step 4: Extend the pagination script's postMessage handler**

In `PAGINATION_SCRIPT` (around the existing `if (data.type === 'cv-scale')` block), add two new branches before the existing scale branch ends. New code:

```js
    if (data.type === 'cv-text-deltas') {
      var roles = ['paragraph', 'header', 'title'];
      var ranges = {
        paragraph: [-3, 5],
        header: [-3, 5],
        title: [-4, 6],
      };
      var nextDeltas = data.deltas || {};
      var changed = false;
      for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var raw = nextDeltas[role];
        var prop = '--cv-text-' + role + '-delta';
        if (typeof raw !== 'number' || !isFinite(raw)) {
          if (document.documentElement.style.getPropertyValue(prop)) {
            document.documentElement.style.removeProperty(prop);
            changed = true;
          }
          continue;
        }
        var lo = ranges[role][0];
        var hi = ranges[role][1];
        if (raw < lo) raw = lo;
        if (raw > hi) raw = hi;
        var next = raw + 'pt';
        if (document.documentElement.style.getPropertyValue(prop) !== next) {
          document.documentElement.style.setProperty(prop, next);
          changed = true;
        }
      }
      if (changed) {
        lastPostedHeight = -1;
        schedule();
      }
      return;
    }
    if (data.type === 'cv-media-delta') {
      var mediaRaw = Number(data.value);
      var prop = '--cv-media-delta';
      if (!isFinite(mediaRaw)) {
        if (document.documentElement.style.getPropertyValue(prop)) {
          document.documentElement.style.removeProperty(prop);
          lastPostedHeight = -1;
          schedule();
        }
        return;
      }
      if (mediaRaw < -8) mediaRaw = -8;
      if (mediaRaw > 12) mediaRaw = 12;
      var nextMedia = mediaRaw + 'mm';
      if (document.documentElement.style.getPropertyValue(prop) !== nextMedia) {
        document.documentElement.style.setProperty(prop, nextMedia);
        lastPostedHeight = -1;
        schedule();
      }
      return;
    }
```

Why these branches sit alongside `cv-scale` rather than getting bundled with it: the scale slider and the size sliders have independent debounce timing and independent reset paths in the editor, so coalescing them server-side would force an artificial coupling on the client UI for no benefit.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @cvie/shared test -- renderer.test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cvie-fr/shared/src/templates/renderer.ts cvie-fr/shared/src/templates/renderer.test.ts
git commit -m "feat(shared): emit text/media size deltas + extend preview postMessage bridge"
```

---

### Task 4: Refactor classique.ts — classify font-size + media

**Files:**
- Modify: `cvie-fr/shared/src/templates/styles/classique.ts`

- [ ] **Step 1: Update import**

Change line 1 of `classique.ts`:

```ts
import { s, sText, sMedia } from "./_scaled";
```

- [ ] **Step 2: Swap text font-sizes to sText() per role**

Apply the role classification table (see plan header) to every `font-size: ${s(N, "pt")}` in the file. Below is the full per-rule replacement list — do these as exact `Edit` operations against the line context shown:

| Location (line in current file) | Selector / context              | Old                            | New                                       | Role        |
|---|---|---|---|---|
| ~line 98  | `.cv` body default              | `${s(10, "pt")}`               | `${sText(10, "pt", "paragraph")}`         | paragraph   |
| ~line 194 | `.cv .portfolio-qr-label`       | `${s(7.5, "pt")}`              | `${sText(7.5, "pt", "paragraph")}`        | paragraph   |
| ~line 206 | `.cv header h1`                 | `${s(24, "pt")}`               | `${sText(24, "pt", "title")}`             | title       |
| ~line 218 | `.cv header .job-title`         | `${s(18, "pt")}`               | `${sText(18, "pt", "header")}`            | header      |
| ~line 233 | `.cv header .contact`           | `${s(9, "pt")}`                | `${sText(9, "pt", "paragraph")}`          | paragraph   |
| ~line 255 | `.cv header .summary`           | `${s(10, "pt")}`               | `${sText(10, "pt", "title")}`             | title       |
| ~line 278 | `.cv section h2`                | `${s(15, "pt")}`               | `${sText(15, "pt", "header")}`            | header      |
| ~line 326 | `.cv article h3`                | `${s(11, "pt")}`               | `${sText(11, "pt", "header")}`            | header      |
| ~line 338 | `.cv article .entry-meta`       | `${s(9, "pt")}`                | `${sText(9, "pt", "header")}`             | header      |
| ~line 350 | `.cv article .entry-sub`        | `${s(10, "pt")}`               | `${sText(10, "pt", "paragraph")}`         | paragraph   |
| ~line 362 | `.cv article .entry-description, p, li` | `${s(9.5, "pt")}`      | `${sText(9.5, "pt", "paragraph")}`        | paragraph   |
| ~line 379 | `.cv .skills-grouped li`        | `${s(9.8, "pt")}`              | `${sText(9.8, "pt", "paragraph")}`        | paragraph   |
| ~line 401 | `.cv .skills-grouped .skill-level` | `${s(8.5, "pt")}`           | `${sText(8.5, "pt", "paragraph")}`        | paragraph   |
| ~line 414 | `.cv .languages-list`           | `${s(9.8, "pt")}`              | `${sText(9.8, "pt", "paragraph")}`        | paragraph   |
| ~line 440 | `.cv .interests-list`           | `${s(9.8, "pt")}`              | `${sText(9.8, "pt", "paragraph")}`        | paragraph   |
| ~line 459 | `.cv article ul li::marker`     | `${s(14.25, "pt")}`            | `${sText(14.25, "pt", "paragraph")}`      | paragraph   |
| ~line 465 | `.cv .skills-grouped li::marker`| `${s(14.7, "pt")}`             | `${sText(14.7, "pt", "paragraph")}`       | paragraph   |

Do NOT touch line 84 (`.cv-page-advisory-text strong`) — that's preview chrome, not document content. Same for line 54 (`.cv-page-advisory`) which uses literal `9pt`.

- [ ] **Step 3: Swap photo + QR width/height to sMedia()**

```ts
// .cv header .photo (~lines 165-166)
  width: ${sMedia(28, "mm")};
  height: ${sMedia(28, "mm")};
// .cv .portfolio-qr-box (~lines 177-178)
  width: ${sMedia(28, "mm")};
  height: ${sMedia(28, "mm")};
```

Leave the borders, border-radius, and padding on plain `s()` — those describe frame chrome, not media size, so they stay tied to density only.

- [ ] **Step 4: Verify the regenerated CSS still snapshot-matches existing tests**

Run: `bun run --filter @cvie/shared test -- renderer.test`
Expected: PASS — no test asserts the literal `s()` form, only rendered output. If a snapshot test fails, it's a real regression: the rendered HTML at default deltas (= 0) MUST be identical to before, because `calc(X * scale + 0pt) === calc(X * scale)` only after the browser resolves it; the strings differ. Update snapshots only after a careful diff confirming the only changes are added `+ var(--cv-text-...)` terms.

- [ ] **Step 5: Commit**

```bash
git add cvie-fr/shared/src/templates/styles/classique.ts
git commit -m "feat(shared): classify classique typography + media into role buckets"
```

---

### Task 5: Refactor moderne.ts — classify font-size + media

**Files:**
- Modify: `cvie-fr/shared/src/templates/styles/moderne.ts`

- [ ] **Step 1: Update import**

```ts
import { s, sText, sMedia } from "./_scaled";
```

- [ ] **Step 2: Apply the role table to every font-size**

For each `font-size: ${s(N, "pt")}` in moderne.ts, classify by SELECTOR (not by point size — moderne uses different baseline values):

| Selector                              | Role        |
|---|---|
| `.cv` (body default)                  | paragraph   |
| `.cv header h1`                       | title       |
| `.cv header .summary`                 | title       |
| `.cv header .job-title`               | header      |
| `.cv section h2`                      | header      |
| `.cv article h3`                      | header      |
| `.cv article .entry-meta`             | header      |
| `.cv header .contact*`                | paragraph   |
| `.cv article .entry-sub`              | paragraph   |
| `.cv article .entry-description, p, li` | paragraph |
| `.cv .skills-grouped li`              | paragraph   |
| `.cv .skills-grouped .skill-level`    | paragraph   |
| `.cv .languages-list`                 | paragraph   |
| `.cv .interests-list`                 | paragraph   |
| `.cv .portfolio-qr-label`             | paragraph   |
| `.cv ... ::marker`                    | paragraph   |

Reading order: walk top-to-bottom in the file, replace each `${s(N, "pt")}` whose declaration line starts with `font-size:` using the role for that selector. Skip non-`font-size` uses of `s()`.

- [ ] **Step 3: Swap photo + QR width/height to sMedia()**

In moderne.ts find `.cv header .photo` and `.cv .portfolio-qr-box` blocks and apply:

```ts
  width: ${sMedia(<existing-N>, "mm")};
  height: ${sMedia(<existing-N>, "mm")};
```

(Use whatever the current literal mm value is — moderne may use a different baseline than classique.)

- [ ] **Step 4: Run renderer tests**

Run: `bun run --filter @cvie/shared test -- renderer.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cvie-fr/shared/src/templates/styles/moderne.ts
git commit -m "feat(shared): classify moderne typography + media into role buckets"
```

---

### Task 6: Refactor minimaliste.ts — classify font-size + media

**Files:**
- Modify: `cvie-fr/shared/src/templates/styles/minimaliste.ts`

- [ ] **Step 1: Update import**

```ts
import { s, sText, sMedia } from "./_scaled";
```

- [ ] **Step 2: Apply role table**

Same selector-driven mapping as Task 5. Note: minimaliste uses 22mm photo (not 28mm) — preserve the existing baseline numbers, only swap `s()` → `sText()`/`sMedia()` with the right role.

- [ ] **Step 3: Swap photo + QR width/height to sMedia()**

```ts
  width: ${sMedia(22, "mm")};
  height: ${sMedia(22, "mm")};
```

(Confirm the `22` matches what's currently in the file before editing.)

- [ ] **Step 4: Run renderer tests**

Run: `bun run --filter @cvie/shared test`
Expected: ALL tests pass — this includes `defaults.test.ts`, `registry.test.ts`, `renderer.test.ts`, `templateSync.test.ts`, plus the new `cv.test.ts` and `scaled.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add cvie-fr/shared/src/templates/styles/minimaliste.ts
git commit -m "feat(shared): classify minimaliste typography + media into role buckets"
```

---

### Task 7: EditorPreviewPane — post deltas on iframe load + on change

**Files:**
- Modify: `cvie-fr/client/src/features/editor/components/EditorPreviewPane.tsx`

- [ ] **Step 1: Add memoized delta selectors**

Replace the existing `const watchedValues = useWatch({ control });` line (~line 96) — keep it, but ALSO add immediately after it:

```tsx
  const textSizes = useWatch({ control, name: "appearance.textSizes" });
  const mediaSize = useWatch({ control, name: "appearance.mediaSize" });
  const textSizesRef = useRef<typeof textSizes>(textSizes);
  const mediaSizeRef = useRef<typeof mediaSize>(mediaSize);
  useEffect(() => {
    textSizesRef.current = textSizes;
  }, [textSizes]);
  useEffect(() => {
    mediaSizeRef.current = mediaSize;
  }, [mediaSize]);
```

- [ ] **Step 2: Add postTextDeltas + postMediaDelta callbacks**

Below the existing `postOverflowMode` callback (~line 217–221):

```tsx
  const postTextDeltas = useCallback(
    (deltas: { paragraph?: number; header?: number; title?: number } | undefined) => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      target.postMessage({ type: "cv-text-deltas", deltas: deltas ?? {} }, "*");
    },
    [],
  );

  const postMediaDelta = useCallback((value: number | undefined) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: "cv-media-delta", value }, "*");
  }, []);
```

- [ ] **Step 3: Push deltas on change**

Below the existing `postOverflowMode` effect (~line 231–234):

```tsx
  useEffect(() => {
    if (!html) return;
    postTextDeltas(textSizes);
  }, [textSizes, html, postTextDeltas]);

  useEffect(() => {
    if (!html) return;
    postMediaDelta(mediaSize);
  }, [mediaSize, html, postMediaDelta]);
```

- [ ] **Step 4: Replay deltas onLoad**

Inside the iframe's `onLoad` handler (~line 535–544), after the existing `postOverflowMode(overflowModeRef.current)` line, add:

```tsx
                    postTextDeltas(textSizesRef.current);
                    postMediaDelta(mediaSizeRef.current);
```

- [ ] **Step 5: Run client tests**

Run: `bun run --filter @cvie/client test -- EditorPreviewPane`
Expected: PASS (no test currently exercises the new postMessage calls — that's fine; existing tests must not regress).

- [ ] **Step 6: Commit**

```bash
git add cvie-fr/client/src/features/editor/components/EditorPreviewPane.tsx
git commit -m "feat(editor): post text + media size deltas to preview iframe"
```

---

### Task 8: DesignPanel — Tailles section with five sliders

**Files:**
- Modify: `cvie-fr/client/src/features/editor/components/DesignPanel.tsx`

This is where the frontend-design taste shows. Match the existing card pattern (border `var(--color-rule)`, `bg-white/75`, `divide-y` rows, `font-mono-caps` micro-labels). Use a native `<input type="range">` styled with WebKit pseudo-classes; numeric value rendered with `tabular-nums` to the right.

- [ ] **Step 1: Add type-aliased constants near the top of the file**

Below the existing `CHANNELS` constant:

```tsx
type TextRole = "paragraph" | "header" | "title";

type SizeControl =
  | { kind: "text"; role: TextRole; label: string; hint: string; min: number; max: number; step: number; unit: "pt" }
  | { kind: "media"; label: string; hint: string; min: number; max: number; step: number; unit: "mm" };

const SIZE_CONTROLS: ReadonlyArray<SizeControl> = [
  { kind: "text", role: "title", label: "Titre", hint: "Nom et résumé d'en-tête", min: -4, max: 6, step: 0.5, unit: "pt" },
  { kind: "text", role: "header", label: "Sections", hint: "Titres de sections, intitulés de poste", min: -3, max: 5, step: 0.5, unit: "pt" },
  { kind: "text", role: "paragraph", label: "Paragraphes", hint: "Corps de texte, listes, métadonnées", min: -3, max: 5, step: 0.5, unit: "pt" },
  { kind: "media", label: "Photo et QR", hint: "Taille du portrait et du code QR", min: -8, max: 12, step: 0.5, unit: "mm" },
];
```

- [ ] **Step 2: Add watch + setters for textSizes + mediaSize**

Inside the `DesignPanel` component, below the existing `override = useWatch(...)` (~line 20):

```tsx
  const textSizes = useWatch({ control, name: "appearance.textSizes" });
  const mediaSize = useWatch({ control, name: "appearance.mediaSize" });

  const updateTextSize = useCallback(
    (role: TextRole, value: number) => {
      const next = { ...(textSizes ?? {}), [role]: value };
      // Drop zeros so the persisted draft stays minimal — and so a "neutral"
      // CV doesn't carry a phantom textSizes object that future code might
      // mistakenly read as "user has customised sizes".
      if (next[role] === 0) delete next[role];
      const isEmpty = next.paragraph === undefined && next.header === undefined && next.title === undefined;
      setValue("appearance.textSizes", isEmpty ? undefined : next, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [textSizes, setValue],
  );

  const updateMediaSize = useCallback(
    (value: number) => {
      setValue("appearance.mediaSize", value === 0 ? undefined : value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue],
  );

  const resetSizes = useCallback(() => {
    setValue("appearance.textSizes", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("appearance.mediaSize", undefined, { shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const sizesAreCustom =
    (textSizes && (textSizes.paragraph !== undefined || textSizes.header !== undefined || textSizes.title !== undefined)) ||
    typeof mediaSize === "number";
```

- [ ] **Step 3: Add the Tailles JSX section below the palette card**

Below the existing reset-palette `<div>` (the one at ~lines 128–147), inside the same root `<div role="tabpanel">`:

```tsx
      <header className="mt-4 flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Tailles
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Échelle des éléments
          </h2>
        </div>
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          Δ par défaut
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Ajustez la taille de chaque famille typographique et celle des
        éléments visuels d'en-tête. Zéro correspond au modèle Figma d'origine.
      </p>

      <ul className="flex flex-col divide-y divide-[var(--color-rule)] rounded-md border border-[var(--color-rule)] bg-white/75">
        {SIZE_CONTROLS.map((ctrl) => {
          const value =
            ctrl.kind === "text"
              ? (textSizes?.[ctrl.role] ?? 0)
              : (mediaSize ?? 0);
          const id = ctrl.kind === "text" ? `size-text-${ctrl.role}` : "size-media";
          const formatted = `${value > 0 ? "+" : ""}${value} ${ctrl.unit}`;
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2.5">
              <label htmlFor={id} className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {ctrl.label}
                </span>
                <span className="text-[11px] leading-tight text-[var(--color-ink-soft)]">
                  {ctrl.hint}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={value}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(next)) return;
                    if (ctrl.kind === "text") updateTextSize(ctrl.role, next);
                    else updateMediaSize(next);
                  }}
                  aria-valuemin={ctrl.min}
                  aria-valuemax={ctrl.max}
                  aria-valuenow={value}
                  className={cn(
                    "h-1 w-32 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)]",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-ink)]",
                    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-ink)]/30",
                  )}
                />
                <span className="font-mono-caps inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center rounded border border-[var(--color-rule)] bg-white px-2 text-[11px] tabular-nums text-[var(--color-ink)]">
                  {formatted}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p
          className={cn(
            "font-mono-caps text-[10px] tracking-[0.14em]",
            sizesAreCustom ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
          )}
        >
          {sizesAreCustom ? "Tailles personnalisées" : "Tailles d'origine"}
        </p>
        <button
          type="button"
          onClick={resetSizes}
          disabled={!sizesAreCustom}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Réinitialiser tailles
        </button>
      </div>
```

- [ ] **Step 4: Eyeball the panel in the dev server**

Run: `bun run --filter @cvie/client dev`
Open the editor, switch to Design tab. Expect: the existing Couleurs card, then below it a Tailles card with four rows (Titre / Sections / Paragraphes / Photo et QR), each with a slider, value badge, and a final reset button. Drag each slider — the iframe preview should update live without flicker.

- [ ] **Step 5: Verify A4 layout still holds at extremes**

Drag every slider to its max simultaneously (title +6pt, header +5pt, paragraph +5pt, media +12mm). The CV should still fit ONE page width without horizontal scrollbar; pagination may push to a 2nd page (expected). Then drag everything to its min — content must still be readable, no rules collapse.

- [ ] **Step 6: Commit**

```bash
git add cvie-fr/client/src/features/editor/components/DesignPanel.tsx
git commit -m "feat(editor): add Tailles section with per-role text + media sliders"
```

---

### Task 9: DesignPanel test — sliders and reset

**Files:**
- Create: `cvie-fr/client/src/features/editor/components/__tests__/DesignPanel.sizes.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { DesignPanel } from "../DesignPanel";
import type { CvData } from "@cvie/shared";

function Harness({ initial }: { initial?: Partial<CvData> }) {
  const form = useForm<CvData>({
    defaultValues: {
      personalInfo: { firstName: "A", lastName: "B", portfolioDisplay: "clickable" },
      formations: [], experiences: [], skills: [], languages: [], interests: [],
      ...initial,
    },
  });
  return (
    <FormProvider {...form}>
      <DesignPanel templateId="classique" />
    </FormProvider>
  );
}

describe("DesignPanel — Tailles", () => {
  it("renders four size sliders at 0", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/Titre/i)).toHaveValue("0");
    expect(screen.getByLabelText(/Sections/i)).toHaveValue("0");
    expect(screen.getByLabelText(/Paragraphes/i)).toHaveValue("0");
    expect(screen.getByLabelText(/Photo et QR/i)).toHaveValue("0");
  });

  it("dragging a slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByLabelText(/Paragraphes/i);
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveValue("2");
    expect(screen.getByText(/\+2.*pt/)).toBeInTheDocument();
  });

  it("reset button restores defaults and disables itself", () => {
    render(<Harness initial={{ appearance: { textSizes: { title: 3 }, mediaSize: 4 } }} />);
    const reset = screen.getByRole("button", { name: /Réinitialiser tailles/i });
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByLabelText(/Titre/i)).toHaveValue("0");
    expect(screen.getByLabelText(/Photo et QR/i)).toHaveValue("0");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `bun run --filter @cvie/client test -- DesignPanel.sizes`
Expected: PASS.

- [ ] **Step 3: Run the full client test suite**

Run: `bun run --filter @cvie/client test`
Expected: ALL pass — including the existing CvEditor tests that exercise the Design tab.

- [ ] **Step 4: Commit**

```bash
git add cvie-fr/client/src/features/editor/components/__tests__/DesignPanel.sizes.test.tsx
git commit -m "test(editor): cover Tailles sliders + reset"
```

---

### Task 10: End-to-end validation

- [ ] **Step 1: Run the entire workspace build + tests**

Run: `bun run --filter ... build && bun run --filter ... test`
Expected: green across `@cvie/shared`, `@cvie/client`, `@cvie/server`.

- [ ] **Step 2: Type-check**

Run: `bun run --filter ... typecheck`
Expected: no errors. The CvData type now includes `appearance.textSizes` and `appearance.mediaSize`; any stray code reading `appearance` that didn't expect them should still compile because both new fields are optional.

- [ ] **Step 3: Manual smoke**

Open the editor, fill a CV, hit the Design tab. Drag each of the four new sliders. Verify:
1. Preview reflows live (no flicker, no full reload).
2. Pagination re-runs when sizes grow (page count may change — that's correct).
3. Closing and reopening the editor preserves the chosen sizes (localStorage persistence).
4. PDF export at non-zero deltas matches the preview at the same deltas.
5. Reset button returns the slider AND the preview to baseline.

- [ ] **Step 4: Final commit (if any cleanup)**

Only if any leftover lint/format diffs need to ship. Otherwise no commit.

---

## Self-Review Notes (resolved before plan publication)

1. **Spec coverage.**
   - "Change size of certain texts in the CV" → Tasks 1, 2, 4–6 (per-role helpers + classification).
   - "Per type: paragraphs, headers, titles" → Three roles in `textSizesSchema` + `SIZE_CONTROLS`.
   - "Profile pic & QR code size" → `mediaSize` + `sMedia()`. Photo and QR share one delta because they share one box size by design.
   - "Default = Figma-synced template default" → Default delta is 0, baseline values stay literal in the templates.
   - "Per-CV in DB" → Schema lives on `appearance` which is part of `CvData` and rides the existing localStorage persistence (`useCvDraft`).
   - "Slider with value next to it" → Task 8 step 3.
2. **Placeholders.** None found.
3. **Type consistency.** `TextRole` is identical in `_scaled.ts`, `renderer.ts` (string-typed via the role keys), and `DesignPanel.tsx`. CSS var names (`--cv-text-paragraph-delta`, `--cv-text-header-delta`, `--cv-text-title-delta`, `--cv-media-delta`) appear identically in the helper, the renderer emission, and the postMessage script. Slider ranges in `cv.ts`, `renderer.ts`, `PAGINATION_SCRIPT`, and `DesignPanel.tsx` `SIZE_CONTROLS` are aligned to the same min/max table.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-text-and-media-size-controls.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks. Best for the template refactor tasks (4/5/6) which benefit from isolated context.
2. **Inline Execution** — execute tasks in this session with checkpoints at the end of each task.

Which approach?
