# AI Editor Assistant — Design

**Date:** 2026-05-11
**Status:** Draft (carries locked decisions from 2026-04-28 brainstorming)
**Prereqs shipped:** Auth0 (`2026-04-29`), BYOK (`2026-05-07`)

## Goal

Conversational assistant docked at the bottom of the CV editor. User types
prompts ("rewrite this bullet to be more action-oriented", "translate my
summary to formal register", "add an experience at Google as PM 2022–2024").
Assistant streams a reply and proposes structured edits to the CV that the
user accepts/rejects per change or in bulk.

## Out of scope

- Editing `appearance` (palette, locale, sizes, spacing).
- Editing the uploaded attachments themselves.
- Generating PDFs or running templates.
- Replacing the localised UI strings (the assistant speaks FR/EN; it does
  not rewrite labels).

## Locked decisions (do not re-elicit)

| Topic | Decision |
|---|---|
| Edit scope | `personalInfo`, `formations`, `experiences`, `skills`, `languages`, `interests` (incl. experience bullets). No `appearance`. |
| Providers | Anthropic + OpenAI + Google via Vercel AI SDK v6 (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`). User picks per-message. |
| Edit mechanism | Tool calling. Server validates each tool result against `cvDataSchema` before returning to client. |
| Conversation persistence | `localStorage` per CV id (`cvie.editor.assistant.<cvId>`). Mirrors `useCvDraft` pattern. |
| Attachments | PDF (reuse `pdf-parse`) + image (provider-native multimodal). AI never modifies the attachment. |
| Streaming | `streamText` + AI SDK `useChat` on client. Token-by-token text + streamed tool calls. |
| Confirmation flow | Optimistic apply to draft + sidecar `pendingChanges: Map<path, {before, after}>`. Stacked red/green rows in form. Per-change `Annuler` / `Garder` + global `Tout annuler` / `Tout garder`. |
| UI integration | Bottom of editor form column inside `CvEditor`. Collapsed handle by default; click expands. |
| Auth / keys | `resolveProviderKey` (BYOK-first, env fallback). Route uses `requireAuth`. |
| JSON output | If a model refuses tool calling on a given turn, fall back to JSON-mode via `jsonResponseProviderOptions` + `parseAiJson` (helpers from `server/src/services/aiJson.ts`). |

## Server

### Route

`POST /api/v1/cv/assistant/chat` — `requireAuth`.
Path: `server/src/routes/cvAssistant.ts`.

Request:
```ts
{
  cvId: string;
  cv: CvData;                    // current draft (form state)
  messages: UIMessage[];         // AI SDK shape
  provider: AiProvider;
  model: string;
  attachments?: Array<{
    kind: "pdf" | "image";
    name: string;
    mediaType: string;           // "application/pdf" | "image/png" | ...
    dataBase64: string;          // <= 8 MB after base64 decode
  }>;
}
```

Response: `text/event-stream` from `streamText().toDataStreamResponse()`.

### Rate limit

`AI_ASSISTANT_RATE_LIMIT_PER_MIN` env, default **10/min/user**.
Same pattern as `cvImport` / `cvTranslate`.

### Token budget

Request-level cap to prevent runaway costs:
- `maxOutputTokens: 4096`
- Input cap enforced server-side: trim `messages` to last 30 turns, drop
  earlier assistant tool-result content before sending (we already have
  the resulting CV state in `cv`, no need to replay tool outputs).
- Attachment size: 8 MB decoded per attachment, max 3 attachments per
  request.

### Files

```
server/src/routes/cvAssistant.ts             # route + rate limit + auth
server/src/services/cvAssistantService.ts    # streamText orchestration
server/src/services/aiTools/index.ts         # tool registry
server/src/services/aiTools/personalInfo.ts
server/src/services/aiTools/experiences.ts
server/src/services/aiTools/formations.ts
server/src/services/aiTools/skills.ts
server/src/services/aiTools/languages.ts
server/src/services/aiTools/interests.ts
server/src/services/aiTools/helpers.ts       # id-gen, path-format
```

### Tool surface

Each tool returns a **patch**: `{ path: string; before: unknown; after: unknown }[]`.
The client uses `path` to map back into the React Hook Form tree and the
`pendingChanges` sidecar; `before`/`after` drive the red/green diff render.

| Tool | Args (Zod) | Patches |
|---|---|---|
| `setPersonalInfo` | `{ patch: Partial<PersonalInfo> }` (subset of `personalInfoSchema`) | one per changed field, path = `personalInfo.<field>` |
| `addExperience` | `{ experience: ExperienceInput, position?: number }` (id assigned server-side) | one, path = `experiences[<insertIdx>]` |
| `updateExperience` | `{ id: string, patch: Partial<Experience> }` | one per changed field, path = `experiences[<idx>].<field>` |
| `removeExperience` | `{ id: string }` | one, path = `experiences[<idx>]`, after = null |
| `reorderExperiences` | `{ ids: string[] }` (must be permutation) | one, path = `experiences`, before/after arrays |
| `addExperienceBullet` | `{ experienceId, text, position? }` | one, path = `experiences[<idx>].bullets[<i>]` |
| `updateExperienceBullet` | `{ experienceId, index, text }` | one |
| `removeExperienceBullet` | `{ experienceId, index }` | one |
| `addFormation` / `updateFormation` / `removeFormation` / `reorderFormations` | same shape as experience variants minus bullets | |
| `addSkill` / `updateSkill` / `removeSkill` / `reorderSkills` | `Skill` shape | |
| `addLanguage` / `updateLanguage` / `removeLanguage` / `reorderLanguages` | `Language` shape | |
| `addInterest` / `updateInterest` / `removeInterest` / `reorderInterests` | `Interest` shape | |

Validation: each tool computes the would-be-next CV (immutably), runs
`cvDataSchema.safeParse`, and only emits the patch if it succeeds. Failure
returns a tool-result with `ok: false, error` so the model can self-correct.

Ids: server-generated `exp_<8hex>` / `form_<8hex>` / etc. — never trust the
model to invent unique ids.

### System prompt (FR)

Single source of truth in `cvAssistantService.ts`. Highlights:
- Role: "Assistant rédacteur CV en français."
- What you can do: list of tools by name (rendered from the registry).
- What you cannot do: design, locale, file rewrites.
- Style: register matches user's existing summary; never fabricate
  experience, dates, or qualifications.
- Output: prefer tools; if no edit is needed, reply in prose. Never wrap
  tool args in markdown.

## Client

### Files

```
client/src/features/editor/components/ai-assistant/
  AssistantPanel.tsx               # outer container; collapsed/expanded
  AssistantHandle.tsx              # collapsed bar (sparkle + label + chevron)
  ChatBody.tsx                     # message list + streaming text
  AssistantMessage.tsx
  UserMessage.tsx
  ComposerBar.tsx                  # textarea + send + attach + model picker
  ModelPickerPill.tsx
  AttachmentChip.tsx
  PendingChangesHeader.tsx         # "N changements" + tout annuler / tout garder
  index.ts

client/src/features/editor/hooks/
  useAssistantChat.ts              # wraps AI SDK useChat, injects auth + cvId
  usePendingChanges.ts             # Map<path,{before,after}> + apply/revert
  useAssistantConversation.ts      # localStorage persist/restore per cvId
```

### Mount point

Inside `CvEditor.tsx`, at the bottom of the form column (the left scroll
container). Sticky bottom; collapsed state ~52 px tall. Expanded state
height: `min(60vh, 560px)`.

The pending-changes diff renders **inside** the existing form sections
(not in the panel) — each affected field shows a stacked
`before` (red) / `after` (green) row with per-change buttons. The panel
header just shows the global counter + bulk actions.

### State flow

1. User types → `useAssistantChat.append(...)` posts to `/cv/assistant/chat`.
2. Server streams text + tool calls. Each completed tool call carries a
   `patches` array.
3. `usePendingChanges` merges patches into its `Map`. For each entry it
   also calls `form.setValue(path, after, { shouldDirty: false })` so the
   preview reflects the proposed state immediately.
4. Form fields read `pendingChanges.get(path)` to decide whether to render
   the diff stack vs. plain input.
5. Per-change `Garder` removes the entry from the map (leaves form value).
   `Annuler` removes the entry **and** calls `form.setValue(path, before)`.
6. `Tout garder` clears the map; `Tout annuler` reverts every entry then
   clears.

### Localisation

UI strings: FR only (matches rest of editor). System prompt also FR.

## Migration / data model

None. Conversations live in `localStorage`; no DB schema change.

## Testing

- `cvAssistantService` unit tests (mock `streamText`): each tool runs,
  validates, emits a correctly-shaped patch.
- Route test: auth required, rate limit triggers, malformed body rejected.
- Client `usePendingChanges` unit test: apply / revert / bulk.
- Manual: import a CV, ask for a bullet rewrite, verify diff renders + can
  be accepted, verify preview updates live.

## Open items

None blocking — proceed.
