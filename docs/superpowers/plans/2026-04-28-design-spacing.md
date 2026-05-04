# Design — Espacements (spacing controls) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Espacements" section to the Design tab with four granular sliders (page margin, section gap, item gap, line-height) plus a reset button. Defaults = 0 = Figma-synced template baseline. Mirrors the existing "Tailles" pattern (per-CV persistence, live preview via postMessage, additive deltas on top of global density scale).

**Architecture:**
- Schema: extend `appearance` with `spacing: { pageMargin, sectionGap, itemGap, lineHeight }` deltas (mm for spatial roles, unitless for line-height).
- Render: new CSS custom properties (`--cv-space-page-delta`, `--cv-space-section-delta`, `--cv-space-item-delta`, `--cv-line-height-delta`) emitted on `<html style>` and replayed via postMessage bridge.
- Templates: `sSpace(value, unit, role)` and `sLine(value)` helpers wrap each spacing/line-height site, classified per role.
- UI: `DesignPanel` adds a card matching the "Tailles" aesthetic, with native range inputs and a value badge.

**Tech Stack:** Zod, React Hook Form, native `<input type="range">`, postMessage bridge, Vitest + RTL.

---

### Task 1: Schema — `appearance.spacing`

**Files:**
- Modify: `shared/src/schemas/cv.ts`
- Test: `shared/src/schemas/__tests__/cv.test.ts` (or wherever appearance tests live)

- [ ] Add `spacingSchema` with `pageMargin` (mm, -6..8), `sectionGap` (mm, -3..8), `itemGap` (mm, -2..6), `lineHeight` (unitless, -0.2..0.4), all optional.
- [ ] Mount on `appearanceSchema`.
- [ ] Tests: accept valid object, reject out-of-range, allow undefined.
- [ ] Commit.

### Task 2: Helpers — `sSpace()` and `sLine()`

**Files:**
- Modify: `shared/src/templates/styles/_scaled.ts`
- Test: `shared/src/templates/styles/__tests__/_scaled.test.ts`

- [ ] Add `SpaceRole = "page" | "section" | "item"`.
- [ ] `sSpace(value, unit, role)` → `calc(<v><u> * var(--cv-scale, 1) + var(--cv-space-<role>-delta, 0mm))`.
- [ ] `sLine(value)` → `calc(<v> + var(--cv-line-height-delta, 0))` (unitless; multiplies nothing because line-height baselines are already unitless).
- [ ] Update authoring rules JSDoc to mention spacing buckets.
- [ ] Commit.

### Task 3: Renderer — emit spacing CSS vars + postMessage bridge

**Files:**
- Modify: `shared/src/templates/renderer.ts`
- Test: `shared/src/templates/renderer.test.ts`

- [ ] Extend `renderRootStyle` to emit `--cv-space-page-delta`, `--cv-space-section-delta`, `--cv-space-item-delta` (mm) and `--cv-line-height-delta` (unitless) when set.
- [ ] Defensive clamps mirror schema bounds.
- [ ] `Number.isFinite` gate (omit, don't render `0`).
- [ ] Add `cv-space-deltas` and `cv-line-height-delta` postMessage branches in `PAGINATION_SCRIPT` (mirror `cv-text-deltas` / `cv-media-delta`).
- [ ] Tests: emits-when-set, omits-when-undefined, clamps defensively.
- [ ] Commit.

### Task 4: Refactor `classique.ts` — classify spacing + line-height

**Files:**
- Modify: `shared/src/templates/styles/classique.ts`

- [ ] Audit every `margin*`, `padding*`, `gap`, `line-height` site against Rule 2 (page geometry stays literal).
- [ ] Classify into page/section/item buckets:
  - **page**: outer content padding (e.g., `.cv-page` left/right padding) — exclude `.cv` (BASE_PAGE_CSS owned) and `@page`.
  - **section**: `gap` between major content blocks, `margin-bottom` between section containers.
  - **item**: `margin-bottom` between entries inside a section (formations, experiences, etc.), inter-bullet gaps.
- [ ] Wrap with `sSpace(value, "mm", role)`.
- [ ] Replace unitless `line-height: <n>` declarations on content (not chrome) with `sLine(<n>)`.
- [ ] Visual smoke at 0 baseline — preview should be identical to before.
- [ ] Commit.

### Task 5: Refactor `moderne.ts`

Same shape as Task 4. Commit.

### Task 6: Refactor `minimaliste.ts`

Same shape as Task 4. Note: this template hides the photo so spacing roles map slightly differently. Commit.

### Task 7: `EditorPreviewPane` — post spacing + line-height deltas

**Files:**
- Modify: `client/src/features/editor/components/EditorPreviewPane.tsx`

- [ ] `useWatch` `appearance.spacing`.
- [ ] Refs + sync useEffects mirroring `textSizesRef`/`mediaSizeRef`.
- [ ] `postSpaceDeltas` and `postLineHeightDelta` callbacks.
- [ ] Push on form change AND on iframe `onLoad`.
- [ ] Commit.

### Task 8: `DesignPanel` — Espacements section

**Files:**
- Modify: `client/src/features/editor/components/DesignPanel.tsx`

- [ ] Add `SpaceRole`, `SpacingControl` types and `SPACING_CONTROLS` array (4 entries: page margin, section gap, item gap, line-height).
- [ ] Reuse the visual treatment of the Tailles card (heading, hint, value badge with `tabular-nums`, native range inputs, reset button).
- [ ] Slider step = 1 for mm roles, 0.05 for line-height; display formatting differs per role (`+2 mm` vs `+0.2`).
- [ ] Drop-zero logic on update (write undefined when value === 0).
- [ ] Reset button restores all four to baseline; disabled when already at 0.
- [ ] Each slider has unique `aria-label="Espacement — <label>"`.
- [ ] Commit.

### Task 9: DesignPanel test — Espacements

**Files:**
- Create: `client/src/features/editor/components/__tests__/DesignPanel.spacing.test.tsx`

- [ ] Renders four sliders at 0.
- [ ] Dragging a slider updates badge + value.
- [ ] Reset button restores baseline + disables itself.
- [ ] Commit.

### Task 10: End-to-end validation

- [ ] `bun run --filter '*' test` — green across workspaces (note: pre-existing `defaults.test.ts` and 2 client TS errors stay broken — not in scope).
- [ ] `bun run --filter '@cvie/shared' build` and `@cvie/server` build clean.
- [ ] Visual smoke at `0,0,0,0` deltas — preview identical to pre-change baseline.
