# Master CV — Design

**Date:** 2026-05-21
**Status:** Draft (carries locked decisions from 2026-05-21 brainstorming)
**Prereqs shipped:** Auth0 (`2026-04-29`), CV DB persistence (`2026-05-01`), BYOK (`2026-05-07`), AI editor assistant (`2026-05-11`)

## Goal

Give the authenticated user a single "Master CV" — a richer-than-a-CV personal
database holding every experience, formation, skill, project, certification,
summary variant, and free-form note they might ever put on a CV. From it, the
user produces targeted CVs in two ways:

1. **Master CV + offre** — paste a job description; an AI selects the relevant
   master items, rewrites bullets/summaries to match the JD's vocabulary, and
   creates a new CV. Selection is committed by the AI; rewrites land as
   pending changes the user accepts or rejects in the editor.
2. **Master CV manuel** — a picker lists every master item; the user checks
   what to include; a new CV is built from that subset with master text
   verbatim.

The existing "Vierge" and "Copier l'actuel" modes stay untouched. Anonymous
flow is unchanged — the feature is auth-only.

A new `/settings/ai-instructions` page lets the user write free-form
instructions ("write in formal but dynamic French", "always quantify
results", "avoid the words 'synergy' and 'leverage'") that are injected into
the system prompt of every AI feature, so the inline assistant and the
master-CV generator produce consistent output.

## Non-goals

- Cover-letter generation from master + JD.
- Provenance tracking on derived CVs (no `sourceMasterId` field; derived
  CVs are independent snapshots).
- Live propagation from master to derived CVs (or vice versa).
- Anonymous-user version of the master CV.
- Structured AI instruction fields (tone/length/etc. as discrete inputs).
  Free-form text only.
- Per-creation one-off AI instructions. Everything goes through the global
  setting.
- Templates with a native "Projects" section — projects fold into
  `experiences` in derived CVs until a template adds the section.
- Multi-language master CVs. One master holds one set of `summaries[]`
  variants; translation per derived CV remains via `cvTranslate`.
- Sharing or exporting the master CV as its own document.
- A "lift this rewrite back into the master" workflow.

## Locked decisions (from brainstorming)

| # | Decision |
|---|---|
| Q1 | Richer superset schema. Master has fields a regular CV doesn't: per-experience `achievements` bank, multiple labeled `summaries`, `projects`, `certifications`, `notes`, optional `tags` on selectable entries. |
| Q2 | AI does selection + rewriting. The model picks items AND rewrites bullets / summaries / job-title phrasing to match the JD's vocabulary. Rewrites land as pending changes for user review. No fact additions, no date/company/diploma changes. |
| Q3 | Snapshot only. Derived CVs are fully independent of the master. No provenance, no propagation. |
| Q4 | Auth-only. Anon users see the master-mode buttons disabled with a "Sign in" tooltip. |
| Q5 | Dedicated `/master-cv` route + a sidebar pinned entry above the folder list. New editor component for the richer schema; existing CV editor untouched. |
| Q6 | First-visit auto-merge with per-CV checkboxes + a PDF import button. Empty-state has a "Skip" path. |
| Q7 | Create-then-review. Server bakes the selection into a real `Cv` row; rewrites are seeded into the editor's existing `pendingChanges` map. Reuses the AI editor assistant's diff UX. |
| Q8 | Free-form textarea at `/settings/ai-instructions`, 4000-char cap, injected verbatim into every AI system prompt under a fixed header. |
| Q9 | Single compact "Nouveau CV" modal. Four pill buttons (Vierge / Copier / Master CV manuel / Master CV + offre). JD textarea and model picker slide in only for the AI mode. |
| Q10 | Manual mode uses a picker (checkbox list grouped by section) before creating, not a pre-fill-then-trim editor flow. |
| Q11 | New Prisma model `MasterCv` (1:1 with User). Master CV is NOT a row in the `cvs` table. |

## Architecture

### High-level shape

```
[ Master CV editor ]      [ AI instructions setting ]      [ Existing CV editor + assistant ]
        │                            │                                    │
        ▼                            ▼                                    ▼
  /api/v1/master-cv         /api/v1/ai-instructions          /api/v1/cv/* (unchanged)
        │                            │                       /api/v1/cv/assistant/chat
        ▼                            │                                    │
   MasterCv (Postgres)               ▼                                    │
                          UserAiInstruction (Postgres)  ◀──────read───────┘
                                     │                                    │
                                     └──read on every AI call:────────────┘
                                        cvAssistantService  +  cvTailorService
                                        (+ cvTranslate retrofit)
```

### Database schema

```prisma
model MasterCv {
  id        String   @id @default(cuid())
  userId    String   @unique @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  data      Json     // validated server-side against masterCvDataSchema
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("master_cvs")
}

model UserAiInstruction {
  id        String   @id @default(cuid())
  userId    String   @unique @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  text      String   @db.VarChar(4000)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("user_ai_instructions")
}
```

`User` gains two new optional relations:

```prisma
model User {
  // ... existing fields ...
  masterCv       MasterCv?
  aiInstruction  UserAiInstruction?
}
```

Both tables are lazy-created per user — there's no data migration, only the
schema migration that adds the two tables and the two new `User` relations.

### `masterCvDataSchema` (new — `shared/src/schemas/masterCv.ts`)

Reuses existing primitives. Bounds chosen to mirror the regular CV's
ceilings × ~4 (a master CV is a database, not a deliverable). Imports from
`shared/src/schemas/cv.ts`: `personalInfoSchema`, `experienceSchema`,
`formationSchema`, `skillSchema`, `languageSchema`, `interestSchema`,
`cvDateSchema`.

```ts
const TAGS = z.array(z.string().min(1).max(40)).max(20).default([]);

export const masterExperienceSchema = experienceSchema.extend({
  achievements: z.array(z.string().max(MAX_LONG)).max(30).default([]),
  tags: TAGS,
});

export const masterFormationSchema = formationSchema.extend({ tags: TAGS });
export const masterSkillSchema     = skillSchema.extend({ tags: TAGS });

export const masterSummarySchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  label: z.string().min(1).max(64),         // e.g., "Court", "Long FR", "Tech-lead"
  text: z.string().max(MAX_LONG),
});

export const projectSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().min(1).max(MAX_MEDIUM),
  role: z.string().max(MAX_MEDIUM).optional(),
  startDate: cvDateSchema.optional(),
  endDate: cvDateSchema.optional(),
  url: optionalHttpUrl,
  description: z.string().max(MAX_LONG).optional(),
  tags: TAGS,
});

export const certificationSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().min(1).max(MAX_MEDIUM),
  issuer: z.string().max(MAX_MEDIUM),
  date: cvDateSchema.optional(),
  url: optionalHttpUrl,
  tags: TAGS,
});

export const masterCvDataSchema = z.object({
  personalInfo:    personalInfoSchema,
  summaries:       z.array(masterSummarySchema).max(10).default([]),
  experiences:     z.array(masterExperienceSchema).max(50).default([]),
  formations:      z.array(masterFormationSchema).max(30).default([]),
  skills:          z.array(masterSkillSchema).max(120).default([]),
  languages:       z.array(languageSchema).max(20).default([]),
  interests:       z.array(interestSchema).max(40).default([]),
  projects:        z.array(projectSchema).max(40).default([]),
  certifications:  z.array(certificationSchema).max(30).default([]),
  notes:           z.string().max(8000).optional(),
});
```

Id namespacing for master entries: `mexp_<8hex>` / `mform_<8hex>` /
`mskill_<8hex>` / `mlang_<8hex>` / `mint_<8hex>` / `mproj_<8hex>` /
`mcert_<8hex>` / `msum_<8hex>`. Server-generated on create — never trust
clients or models to invent unique ids.

### Server routes

All `requireAuth`. All paths under `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET    | `/master-cv` | 200 `{ data }` or 404 if never seeded. |
| PUT    | `/master-cv` | Full-document replace. Validates against `masterCvDataSchema`. Rejects body > 512 KB. Lazy-creates row. |
| POST   | `/master-cv/seed` | `{ sourceCvIds: string[], pdfExtracted?: cvData }` → returns merged data; **does not persist**. Client previews then PUTs. |
| POST   | `/master-cv/tailor` | SSE stream of tool-call events; ends with `{ type: "done", cvId, pendingChanges }` after the `Cv` row is created. |
| GET    | `/ai-instructions` | 200 `{ text }` (empty string if unset). |
| PUT    | `/ai-instructions` | `{ text }`. Rejects > 4000 chars. Upserts. |

### Files (server)

```
server/src/routes/masterCv.ts                   # CRUD (GET, PUT, seed)
server/src/routes/masterCvTailor.ts             # POST /tailor (SSE)
server/src/routes/aiInstructions.ts             # GET, PUT

server/src/services/masterCvService.ts          # validate, persist, merge/dedup
server/src/services/cvTailorService.ts          # streamText orchestration + WorkingCv
server/src/services/cvTailorTools/index.ts      # tool registry
server/src/services/cvTailorTools/personalInfo.ts
server/src/services/cvTailorTools/experiences.ts
server/src/services/cvTailorTools/formations.ts
server/src/services/cvTailorTools/skills.ts
server/src/services/cvTailorTools/languages.ts
server/src/services/cvTailorTools/interests.ts
server/src/services/cvTailorTools/projects.ts
server/src/services/cvTailorTools/order.ts
server/src/services/cvTailorTools/finalize.ts
server/src/services/aiInstructions.ts           # buildUserInstructionsBlock(userId)
```

### Files (client)

```
client/src/features/master-cv/
  components/
    MasterCvEditor.tsx                     # outer container + react-hook-form root
    MasterCvHeader.tsx                     # name banner + import buttons + save status
    SeedingPrompt.tsx                      # first-visit auto-merge dialog
    PdfImportDialog.tsx                    # wraps existing cvImport pipeline
    MasterCvPicker.tsx                     # manual-mode picker (used inside Nouveau-CV modal)
    TailorStreamPanel.tsx                  # streaming progress UI (used inside Nouveau-CV modal)
    TagsInput.tsx                          # reusable chip input
    sections/
      PersonalInfoSection.tsx              # thin wrapper around existing PersonalInfoForm
      SummariesSection.tsx                 # master-only — N labeled variants
      ExperiencesSection.tsx               # wraps editor/ExperiencesSection + achievements & tags
      FormationsSection.tsx                # wraps + tags
      SkillsSection.tsx                    # wraps + tags
      LanguagesSection.tsx                 # reuses editor/LanguagesSection verbatim
      InterestsSection.tsx                 # reuses editor/InterestsSection verbatim
      ProjectsSection.tsx                  # new
      CertificationsSection.tsx            # new
      NotesSection.tsx                     # single textarea, 8000 chars
  hooks/
    useMasterCv.ts                         # GET on mount, PUT on debounced change (~1s)
    useMasterCvDraft.ts                    # mirror of useCvDraft for the master shape
    useMasterCvTailor.ts                   # wraps SSE consumption
  store/
    masterCvStore.ts                       # thin REST client; auth-only, no localStorage

client/src/features/settings/aiInstructions/
  AiInstructionsPage.tsx
  useAiInstructions.ts                     # GET on mount + PUT debounced 1s
```

The five "wraps existing section" components mount the canonical
`editor/components/*Section.tsx`, then render the master-only extras
(achievements list, tags input) underneath each entry's main fields. The
shared sub-forms remain the single source of truth for personalInfo /
experience / formation / skill rendering and validation.

## Master CV editor surface

### Route

`/master-cv` — new route in `client/src/router.tsx`, behind `requireAuth`
(redirect to `/` if anon). Outside the regular CV editor route tree, so
editor state doesn't bleed.

### Sidebar pinned entry

`EditorSidebar.tsx` gains a single row above the folder list, visible only
when authenticated:

```
┌──────────────────────────┐
│ ★  Mon Master CV       › │
└──────────────────────────┘
─── DOSSIERS ──────────────
  Mes CV
  ...
```

Visual treatment: same baseline as a folder row but with a star glyph and a
faint accent stripe using `--color-ink` (not the per-folder hashed color).
Click → `navigate("/master-cv")`.

### Seeding flow on first visit

On mount of `/master-cv`, `useMasterCv()` does GET `/api/v1/master-cv`:

- **200 → existing master.** Render editor with that data.
- **404 → never seeded.** Check the CV library: if user has ≥1 CV, render
  `SeedingPrompt` modal:
  > "Importer depuis vos CV existants ?"
  > [□] CV #1 — "Dev backend"
  > [□] CV #2 — "Lead tech"
  > …
  > [□] Importer un PDF → opens PdfImportDialog
  > [Ignorer] [Importer la sélection]
- "Ignorer" → PUT an empty master shape (just `personalInfo` from
  `User.email/firstName/lastName` if available). User lands in an empty
  editor.
- "Importer la sélection" → POST `/api/v1/master-cv/seed` with the picked
  `sourceCvIds`. Server merges and returns the merged data. Client shows a
  preview screen ("Vous obtiendrez : 8 expériences, 3 formations, 22
  compétences. Confirmer ?") and PUTs on confirm.
- PDF path: PdfImportDialog reuses the existing `cvImport` service to
  extract CV data from a PDF, then POSTs `/api/v1/master-cv/seed` with an
  additional `pdfExtracted: cvData` field so the merge logic folds it in.

If the user has zero existing CVs and skips the PDF path, no prompt is
shown — they go straight to the empty editor.

### Server-side merge / dedup (`masterCvService.mergeIntoMaster`)

For each section, items are deduplicated by a stable key:

| Section | Dedup key |
|---|---|
| experiences | `(company.toLowerCase().trim(), startDate, jobTitle.toLowerCase().trim())` |
| formations  | `(school.toLowerCase().trim(), degree.toLowerCase().trim(), startDate)` |
| skills      | `name.toLowerCase().trim()` |
| languages   | `name.toLowerCase().trim()` |
| interests   | `name.toLowerCase().trim()` |
| projects    | `(name.toLowerCase().trim(), startDate ?? "")` |
| certifications | `(name.toLowerCase().trim(), issuer.toLowerCase().trim())` |

On collision, the **longer text fields win**: the entry with the longer
`description` is kept; the loser's `bullets` (for experiences) are
appended to the winner's `achievements` bank deduped by exact text. Tags
union. New entries get freshly-namespaced master ids.

`personalInfo` comes from the most-recently-updated source CV among the
selection (by `updatedAt`), with the `User` profile (`email`,
`firstName`, `lastName`) acting as a fallback for any missing fields.
`summaries` are seeded with one entry, `{ id, label: "Par défaut", text:
<personalInfo.summary> }`, only if at least one source had a non-empty
summary.

### Auto-save

Mirrors `useCvDraft`: form change → debounce ~300 ms → PUT. Status badge
uses the existing `SyncStatusBadge` component (`Enregistré` /
`Enregistrement…` / `Hors-ligne`). The master CV is **not** dual-written
to localStorage — auth-only feature, so no offline buffering. PUT failures
trigger the same exponential backoff (1s → 2s → 4s → … → 30s) as
`DbCvStore`. A browser `online` event listener flushes pending writes.

## AI tailoring flow (Master CV + JD → targeted CV)

### Entry point

User picks **Master CV + offre** in the Nouveau-CV modal, pastes JD, picks
a model, clicks **Créer**.

```
[Client: NouveauCvModal]
      │
      │ POST /api/v1/master-cv/tailor  (SSE)
      │ { title, templateId, folderId, jdText, provider, model }
      ▼
[Server: cvTailorService.tailor()]
      │  1. load master CV (snapshot for this request)
      │  2. load UserAiInstruction.text via buildUserInstructionsBlock
      │  3. resolveProviderKey(provider) → BYOK or env
      │  4. streamText({ system, messages, tools, abortSignal })
      │     ─ tools build a WorkingCv accumulator
      │     ─ system prompt = base + user AI instructions + JD + master CV id-only listing
      │  5. on each tool call: validate args; reject unknown ids; stream {ok:true,summary}
      │  6. on finalize: validate WorkingCv with cvDataSchema; on failure, abort
      │  7. create Cv row (data = WorkingCv, title, templateId, folderId, userId)
      │  8. emit final SSE event { type:"done", cvId, pendingChanges }
      ▼
[Client: navigate to /editor?cv=<newId>]
      │  pendingChanges held in an in-memory handoff store (not query string)
      ▼
[Editor mounts → seeds usePendingChanges Map from the handoff]
```

### Why server creates the CV

The existing AI assistant streams tool calls to the client which applies
them to form state. Here we need an atomic "this CV was generated from
these master entries with these rewrites" outcome — half a CV is worse
than no CV. Server orchestrates, validates, persists, then the client
opens the resulting CV. The user reviews every rewrite via the
pending-changes diff once the editor opens, but the *selection* (which
experiences, which bullets) is already baked in — matching Q7's
"create-then-review" decision; re-selecting items at review time would
mean re-running the AI.

### Tool surface

Different shape from the existing assistant — the assistant *edits* a CV,
the tailor *builds* one. Tools are called by the model in sequence; each
adds to a server-side `WorkingCv` accumulator that starts empty.

| Tool | Args | Effect on `WorkingCv` |
|---|---|---|
| `setPersonalInfo` | `{ summaryId: string, summaryRewrite?: string }` (`summaryId` must be a `masterCv.summaries[*].id`) | Copies master `personalInfo` verbatim; `personalInfo.summary` = picked variant's text (or `summaryRewrite` if provided; the pair `{before:variant.text, after:rewrite}` is recorded as a pendingChange at path `personalInfo.summary`). |
| `selectExperience` | `{ masterId, achievementIndices: number[], bulletRewrites?: Record<number,string>, jobTitleRewrite?: string }` | Copies master experience into the working CV; uses only the picked `achievements` indices as `bullets[]`. For each `bulletRewrites[i]`, the rewritten text lands in `bullets[i]` and `{before, after}` is recorded as a pendingChange. Same for `jobTitleRewrite`. |
| `selectFormation` | `{ masterId, descriptionRewrite? }` | Copies master formation; optional description rewrite recorded as pendingChange. |
| `selectSkills` | `{ masterIds: string[] }` | Pure selection — no rewriting. |
| `selectLanguages` | `{ masterIds: string[] }` | Pure selection. |
| `selectInterests` | `{ masterIds: string[] }` | Pure selection. |
| `selectProject` | `{ masterId, descriptionRewrite? }` | Project renders as a synthetic experience entry: `jobTitle = "[Projet] " + project.name`, `company = project.role ?? ""`, dates from project, `bullets = []`, `description = project.description`. Prepended to `experiences[]`. |
| `setOrder` | `{ experiences: string[], formations: string[], skills: string[] }` (lists of ids in display order; must be a permutation of selected ids) | Reorders the working CV's arrays. |
| `finalize` | `{}` | Signals completion. Service runs `cvDataSchema.safeParse(WorkingCv)`. On success, persists `Cv` row. |

Tool implementations enforce: only ids that exist in the master are
accepted (rejected with `ok: false, error: "unknown_master_id"` so the
model can self-correct within the same stream). Each successful tool
result streams `{ ok: true, summary: "..." }` for the progress UI.

### Streaming progress UI

The "Nouveau CV" modal swaps to a streaming panel after **Créer**:

```
┌──────────────────────────────────────────┐
│  Préparation de votre CV…               │
│                                          │
│  ✓ Profil sélectionné                    │
│  ✓ 5 expériences choisies sur 12         │
│  ✓ 8 compétences choisies sur 30         │
│  ⋯ Reformulation des bullets…            │
│                                          │
│  [Annuler]                               │
└──────────────────────────────────────────┘
```

Each tool's `summary` renders as one line. "Annuler" aborts the
`AbortController`; nothing is persisted. On the `done` event the modal
closes and the client navigates to `/editor?cv=<id>` with `pendingChanges`
in the in-memory handoff store.

### System prompt skeleton

```
Tu es un assistant qui construit un CV ciblé pour une offre d'emploi.

Tu disposes d'un "Master CV" contenant toutes les informations de l'utilisateur.
Tu dois sélectionner et adapter les éléments les plus pertinents pour l'offre.

INSTRUCTIONS UTILISATEUR:
<UserAiInstruction.text — verbatim; "(aucune)" if empty>

MASTER CV (résumé pour sélection):
<JSON-summary of master entries: ids, headline fields, tags. NO long text bodies.>

OFFRE D'EMPLOI:
<jdText — capped at 8000 chars; longer JDs get truncated with a note>

RÈGLES:
- Tu DOIS appeler dans l'ordre : setPersonalInfo, selectExperience (×N),
  selectFormation (×N), selectSkills, selectLanguages, selectInterests,
  selectProject (si pertinent), setOrder, finalize.
- Ne fabrique JAMAIS un masterId qui n'existe pas.
- Pour les reformulations : ne change que le vocabulaire pour matcher l'offre.
  N'ajoute pas de faits, ne change pas les dates, les entreprises, les diplômes.
- Cible : 3–6 expériences, 1–3 formations, 8–15 compétences. Adapte selon
  la séniorité de l'offre.
```

Master-CV summary listing is JSON with: `experiences[].{id, jobTitle,
company, startDate, endDate, tags, achievementCount}`, `formations[].{id,
degree, school, startDate, endDate, tags}`, `skills[].{id, name, category,
tags}`, `summaries[].{id, label}` (no text), `languages[].{id, name,
level}`, `interests[].{id, name}`, `projects[].{id, name, role, tags}`,
`certifications[].{id, name, issuer}`. The tool implementations rehydrate
full text by id when applying — the model never needs the body to make a
selection.

The `RÈGLES` section sits **after** the user instructions block, so hard
rules (no fabrication, valid masterIds only) take priority over anything
the user might write in their instructions.

### Rate limit, token budget, abort

- Rate: `AI_TAILOR_RATE_LIMIT_PER_MIN` env, default **5/min/user** (slower
  than the inline assistant because each call is heavier).
- Tokens: `maxOutputTokens: 8192`. Input cap via the ids-only optimization
  plus JD truncation at 8000 chars.
- Abort: client `AbortController` propagates to server; in-flight `Cv` row
  is never created if abort fires before `finalize`.

### Provider/model selection

Modal's model picker defaults to the user's saved `UserAiPreference` for
`feature = "cv-tailor"`. Falls back to the `feature = "cv-assistant"`
preference if `cv-tailor` is unset. Falls back to a hard default
(`anthropic` + `claude-sonnet-4-6`) if both are unset. Selection is
persisted to `cv-tailor` on submit.

## AI instructions setting

### Surface

New route `/settings/ai-instructions` under `client/src/features/settings/`,
alongside `aiKeys` and `aiPreferences`. One-screen form: one textarea, a
4000-char counter, an "Effacer" button, and an "Enregistrer" button.
Auto-save on edit (debounce 1 s) is the source of truth; the button
flushes immediately for affordance. Empty state shows two collapsible
"Exemples" (copy/paste only — not auto-applied).

### Routes

```
GET  /api/v1/ai-instructions   → 200 { text }  (empty string if unset)
PUT  /api/v1/ai-instructions   → 200 { text }  (rejects > 4000 chars with 400 { code:"too_long" })
```

Both `requireAuth`. PUT upserts `UserAiInstruction`.

### Injection helper

```ts
// server/src/services/aiInstructions.ts
export async function buildUserInstructionsBlock(userId: string): Promise<string> {
  const row = await prisma.userAiInstruction.findUnique({ where: { userId } });
  const text = row?.text.trim() || "(aucune)";
  return `INSTRUCTIONS UTILISATEUR:\n${text}`;
}
```

Wired into:
- `cvAssistantService` (existing inline assistant) — retrofit; the current
  system prompt gains the block between the role line and the `RÈGLES`
  section.
- `cvTailorService` (new master-CV generator).
- `cvTranslate` (retrofit; translation register is exactly the kind of
  thing users will write rules about).
- `cvImport` is **not** retrofitted (it's transcription, not generation —
  instructions don't apply).

### Settings nav

`/settings` index gains a third row:
- Clés IA (existing)
- Préférences IA (existing)
- **Instructions IA** (new)

## "Nouveau CV" modal redesign

### Layout (≈480 px, grows for JD mode)

```
┌──────────────────────────────────────────────────────────┐
│  NOUVEAU CV                                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Nouveau CV                                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  COMMENT VOULEZ-VOUS COMMENCER ?                         │
│  ┌──────────────┐ ┌──────────────┐                       │
│  │   Vierge     │ │  Copier      │                       │
│  │              │ │  l'actuel    │                       │
│  └──────────────┘ └──────────────┘                       │
│  ┌──────────────┐ ┌──────────────┐                       │
│  │ Master CV    │ │ Master CV    │                       │
│  │   manuel     │ │  + offre 🪄  │                       │
│  └──────────────┘ └──────────────┘                       │
│                                                          │
│  [— slides in when "Master CV + offre" is picked —]      │
│  COLLEZ L'OFFRE D'EMPLOI                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ (textarea, 6 rows, max 8000 chars)              │    │
│  └─────────────────────────────────────────────────┘    │
│  Modèle IA: [Claude Sonnet 4.6 ▾]                       │
│                                                          │
│                            [ANNULER]    [Créer]          │
└──────────────────────────────────────────────────────────┘
```

- Four mode buttons in a 2×2 grid, ~200×64 each.
- The two "Master CV" buttons are disabled with a tooltip ("Créez d'abord
  votre Master CV") if `useMasterCv()` returns 404.
- "Copier l'actuel" disabled (existing behaviour) when there's no active
  CV.
- Model picker only renders for "Master CV + offre" mode.
- "Créer" enabled only when: title is non-empty AND (mode ≠ "Master CV +
  offre" OR JD textarea is non-empty AND a model is selected).

### Behavior per mode

| Mode | On Créer |
|---|---|
| Vierge | POST `/api/v1/cv` with `data = createEmptyCv()` (unchanged) |
| Copier l'actuel | POST `/api/v1/cv` with `data = currentCvBody` (unchanged) |
| Master CV manuel | Modal swaps to `MasterCvPicker`; on Picker-Créer, POST `/api/v1/cv` with assembled body |
| Master CV + offre | Modal swaps to `TailorStreamPanel`; POST `/api/v1/master-cv/tailor`; on `done` event, navigate to `/editor?cv=<id>` with pendingChanges handoff |

State machine: `mode-select` → (`picker` \| `streaming` \| direct submit)
→ navigate-to-editor. "Annuler" at any stage closes the modal and aborts
any in-flight request.

### `MasterCvPicker`

Overlay (~640 px wide) shown inline in the modal:

```
┌───────────────────────────────────────────────────────────┐
│  CHOISISSEZ LES ÉLÉMENTS DE VOTRE NOUVEAU CV              │
│                                                           │
│  ▼ EXPÉRIENCES (5 / 12 sélectionnées)                     │
│    ☑ Lead Backend, Acme · 2022 – présent                  │
│       ☑ Migré l'infra vers Kubernetes (gain 40% latence)  │
│       ☑ Recruté et formé 4 ingénieurs                     │
│       ☐ Mené la refonte du SSO interne                    │
│       … (7 autres bullets)                                │
│    ☑ Dev backend, Globex · 2020 – 2022                    │
│    ☐ Stage, Initech · 2019                                │
│                                                           │
│  ▼ FORMATIONS (2 / 3)                                     │
│  ▼ COMPÉTENCES (12 / 30)   [chip toggle layout]           │
│  ▼ LANGUES (3 / 5)         ▼ INTÉRÊTS (4 / 8)             │
│  ▼ PROJETS (2 / 8)         ▼ CERTIFICATIONS (1 / 4)       │
│  ▼ RÉSUMÉ                                                 │
│    ○ Court  ● Long FR  ○ Tech-lead  ○ Aucun               │
│                                                           │
│             [Retour]                  [Créer]             │
└───────────────────────────────────────────────────────────┘
```

- Section headers collapsible; experiences expanded by default. Counters
  live-update.
- Each experience expands to show its `achievements[]`; checkboxes nest.
  No pre-checking — the user picks explicitly.
- "Résumé" is a radio: pick one summary variant or "Aucun".
- "Créer" assembles the picked items into a `CvData` shape (achievements
  become `bullets[]`; tags drop; master ids are not preserved) and POSTs
  `/api/v1/cv` like any other CV creation.

## Retrofits

### Existing AI assistant

`cvAssistantService` system-prompt builder now calls
`buildUserInstructionsBlock(userId)` and inserts the result between the
role line and the `RÈGLES` block. No other behavioural change. Existing
tests stay green if they mock the helper to return `"(aucune)"`. New unit
test asserts the block is present and contains the user's text when set.

### Existing `cvTranslate`

Same treatment: inject the user instructions block into the translation
system prompt. Translation register is the main thing users will write
rules about ("toujours en français formel"), so this is high-value.

### Existing `cvImport`

Not retrofitted. PDF → CV extraction is transcription; user style rules
don't apply.

## Testing

### Server

- `masterCvService.mergeIntoMaster` unit tests: dedup conflicts,
  longest-text-wins, achievements fold from loser's bullets, empty source
  list returns empty merge, identical source list is idempotent, tag
  union across collisions, `personalInfo` picked from most-recently-updated
  source, PDF-extracted data folds in correctly.
- `cvTailorService` unit tests with mocked `streamText`: each tool runs and
  validates; `selectExperience` with unknown id returns `ok: false`;
  `finalize` triggers `cvDataSchema` validation; abort mid-stream creates
  no `Cv` row; `personalInfo` is copied verbatim from master.
- `buildUserInstructionsBlock` unit test: empty/missing row → "(aucune)";
  populated row → verbatim text wrapped in the fixed header.
- Route tests: auth required on all six new routes; PUT `/master-cv`
  rejects > 512 KB; PUT `/ai-instructions` rejects > 4000 chars; tailor
  rate-limit triggers at 6th request/min.

### Client

- `MasterCvPicker` unit test: section counters track checked state,
  "Créer" disabled when nothing picked, assembled CvData has correct shape
  (achievements → bullets), summary radio behaviour.
- `useMasterCvTailor` unit test: SSE event handling (tool-call updates,
  done event, abort, error event).
- `SeedingPrompt` unit test: 404 path renders prompt; checkboxes drive
  POST body; "Ignorer" PUTs empty shape; preview screen confirms before
  PUT.
- `AiInstructionsPage` unit test: GET populates textarea; PUT fires on
  debounced edit; > 4000-char input is blocked client-side.

### Manual smoke

- Build a master CV from scratch in the editor; verify auto-save badge.
- Trigger first-visit seeding with 3 existing CVs; verify dedup behaviour
  on overlapping experiences.
- Generate a derived CV from a real JD; verify the streaming panel
  updates, the editor opens with pendingChanges, accept/reject works per
  field and in bulk.
- Generate again with the same JD but different AI instructions; verify
  the tone changes meaningfully.
- Edit AI instructions; trigger the inline assistant; verify behaviour
  reflects the instructions.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Master CV grows huge → AI prompt blows the token budget | Ids-only listing in the system prompt; full text re-hydrated by tools. JD truncated at 8000 chars. |
| AI fabricates a master id | Tool returns `ok: false, error: "unknown_master_id"`; model self-corrects within the same stream. |
| User edits master while a tailor request is in flight | Tailor service loads the master once at request start and works on that snapshot; concurrent edits don't affect the in-flight generation. |
| `cvDataSchema` validation fails on `finalize` | Service emits `{type:"error", code:"validation_failed", details}` and creates no `Cv` row. User can retry. |
| User AI instructions try to override hard rules (prompt injection by user) | The `RÈGLES` block in the system prompt sits **after** the user instructions block, so hard rules take priority. Documented in a help link on the settings page. |
| Long pages of free-form instructions slow every AI call | 4000-char cap enforced server-side; trimmed before injection. |
| Manual picker assembles a CV with zero experiences | Allowed — same as the existing "Vierge" mode. The downstream CV editor handles empty sections natively. |

## Migration

- Prisma migration adds `master_cvs` and `user_ai_instructions` tables,
  plus the two new relations on `users`.
- No data migration. Both tables are lazy-created per user.
- No changes to the existing `cvs` table.
- No client localStorage changes — master CV is server-only.

## Open items

None blocking. Proceed to implementation plan.
