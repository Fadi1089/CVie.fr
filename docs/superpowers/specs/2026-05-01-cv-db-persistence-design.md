# CV DB Persistence Design

> Ticket 2 of the cvie-fr roadmap (Auth0 → CV DB persistence → BYOK → AI agent).
>
> Auth0 is shipped (ticket 1). This ticket moves CV records from
> per-browser localStorage into Postgres, scoped to the signed-in user, and
> introduces folders for organization. The anonymous flow remains intact
> end-to-end — anon users keep using localStorage, untouched.

## Goals

- Signed-in users own their CVs at the account level: same library on any device.
- Anonymous users keep working as today (localStorage only). No regression.
- Auto-save persists to the server with a visible status badge.
- Folders organize CVs. "Mes CV" and "Corbeille" are seeded system folders.
- Trashed CVs auto-purge after 30 days. User can restore before then.

## Non-goals

- Real-time multi-device collaboration. Last-write-wins is acceptable.
- Versioning / undo history beyond the trash flow.
- Sharing CVs between users.
- Account deletion UX (handled by a future ticket; cascade is wired so it works mechanically).
- Sync of UI preferences (sidebar collapsed, splitter ratio, scale, overflow). Stays per-device.
- BYOK API keys (separate ticket, gates ticket 3 / AI agent).

## Locked decisions (from brainstorming)

| # | Decision |
|---|---|
| Q1 | Migration prompt on sign-in when local has unimported CVs ("Ne plus demander" checkbox). |
| Q2 | Auto-save with status badge ("Enregistré" / "Enregistrement…" / "Hors-ligne"). |
| Q3 | Last-write-wins. No conflict detection. |
| Q4 | Single `cvs` table with JSONB `data` column. |
| Q5 | Logout clears UI; anon localStorage data stays untouched. |
| Q6 | Trash is the system folder "Corbeille" with 30-day TTL. Restore moves back to a chosen folder. |
| Q7 | Only CV data syncs. UI prefs stay per-device. |
| Q8 | 50 active + 50 trash. Body limit 256 KB. |
| Q9 | Resource-style REST. |
| Q10 | Dual-write: localStorage and server in parallel. |
| Q11 | `pg_cron` daily job at 03:00 UTC. |
| Q12 | Prompt fires on every sign-in until user has at least one DB CV (or dismisses). |
| Q13 | Hybrid pull on sign-in: all metadata + body of router-gate CV. |
| Q14a | Flat folder structure (no nesting). |
| Q14b | Two system folders seeded per user: "Mes CV" (default) and "Corbeille". |
| Q14c | 20 custom folders per user, name 1–64 chars, case-folded unique. Right-click to move. No drag-and-drop yet. |

## Architecture

A single `CvStore` interface in `client/src/features/cv-library/store/` has
two implementations:

- `LocalCvStore` — wraps the existing localStorage logic. Anon users
  consume this exclusively.
- `DbCvStore` — wraps the server REST API. Internally writes through a
  per-identity `LocalCvStore` (key prefix `cvie.user.<sub>.cv.…`) for
  durable cache and offline buffering, then PATCHes the server.

A `useCvStore()` hook reads `useAuth0().isAuthenticated` and returns the
right impl. `useCvDraft` (auto-save), `EditorSidebar` (library list),
and the router gate consume this hook instead of touching storage
directly.

### Sync flow (signed-in)

```
form.watch
  └─▶ useCvDraft (debounce ~300 ms)
        ├─▶ LocalCvStore.writeDraft(id, body)   (sync, immediate, durable)
        └─▶ DbCvStore.queuePatch(id, body)      (debounce 1 s, retry on fail)
```

The DB queue is a `Map<id, pending>` — successive edits to the same CV
collapse into one PATCH. Status emits `saving` while a request is in
flight, `saved` on 200, `offline` on network failure (with exponential
backoff `1s, 2s, 4s, …, 30s`), `error` on 4xx/5xx.

A browser `online` event listener flushes the queue when connectivity
returns.

### Login pull

```
useMe resolves
  ├─▶ if local has CVs not in cvie.migration.imported_ids[<sub>]
  │   and not dismissed_for[<sub>]:
  │   └─▶ render ImportLocalCvsModal
  └─▶ else:
      ├─▶ GET /api/v1/cv          (metadata only)
      └─▶ GET /api/v1/cv/:active  (body of router-gate CV)
```

### Logout

`LogoutButton` already navigates `/` (ticket 1). On the next render,
`useCvStore()` returns `LocalCvStore`. The DB cache namespace
(`cvie.user.<sub>.*`) is cleared on logout. The anonymous namespace
(`cvie.cv.library.v1`, `cvie.cv.draft.<id>`) is untouched.

## Database schema

```prisma
model Cv {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  folderId   String   @map("folder_id")
  folder     Folder   @relation(fields: [folderId], references: [id])
  title      String
  templateId String   @map("template_id")
  data       Json     // CvData blob, validated server-side via cvDataSchema
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([userId, folderId, updatedAt(sort: Desc)])
  @@map("cvs")
}

model Folder {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  isSystem  Boolean  @default(false) @map("is_system")
  ttlDays   Int?     @map("ttl_days")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  cvs       Cv[]

  @@unique([userId, name])
  @@map("folders")
}

model User {
  // existing fields…
  cvs     Cv[]
  folders Folder[]
}
```

Notes:

- `Cv.deletedAt` is **not** present. Soft-delete is "move to Corbeille"
  — change `folderId` and let `updatedAt` auto-bump for the TTL clock.
- The composite index `(userId, folderId, updatedAt DESC)` covers the
  list-by-folder queries for the sidebar.
- Case-folded uniqueness on `Folder.name` is enforced in app code
  (Postgres unique index is case-sensitive; service-layer normalizes
  `name.trim().toLowerCase()` before comparison).

### `pg_cron` purge job

Applied as a separate, optional migration (skip in non-Supabase envs):

```sql
CREATE OR REPLACE FUNCTION purge_trashed_cvs() RETURNS void AS $$
  DELETE FROM cvs WHERE folder_id IN (
    SELECT id FROM folders
    WHERE is_system = true AND ttl_days IS NOT NULL
  )
  AND updated_at < NOW() - INTERVAL '30 days';
$$ LANGUAGE sql;

SELECT cron.schedule(
  'cvie-purge-trashed-cvs',
  '0 3 * * *',
  'SELECT purge_trashed_cvs()'
);
```

`updated_at` is used as the TTL clock because moving to Corbeille
bumps it. If a user *touches* a trashed CV (e.g. renames before
restoring), the TTL resets — desired UX.

The function is idempotent and callable manually, so local development
can verify behavior without `pg_cron` installed.

### System folder seeding

Extend `upsertUserByAuth0Sub` in `server/src/services/userService.ts`:
on user **create** (not on subsequent upsert), seed two folders in
the same transaction.

```
INSERT INTO folders (id, user_id, name, is_system, ttl_days)
VALUES
  (cuid(), $userId, 'Mes CV',    true, NULL),
  (cuid(), $userId, 'Corbeille', true, 30);
```

The default folder reference (`folderId` for new CVs) is resolved by
querying `WHERE userId = $1 AND isSystem = true AND ttlDays IS NULL`.

## REST API

All routes are guarded by `requireAuth()` (ticket 1 middleware). All
responses set `Cache-Control: no-store`. Body limit 256 KB.

### CV endpoints (extend `server/src/routes/cv.ts`)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/cv` | List active CVs metadata for `userClaims.sub`. No bodies. |
| `GET` | `/api/v1/cv/trash` | List CVs in Corbeille. Metadata. |
| `GET` | `/api/v1/cv/:id` | Single CV with body. 404 if not owned. |
| `POST` | `/api/v1/cv` | Body: `{title, templateId, data, folderId?}`. Defaults `folderId` to user's "Mes CV". 409 `LIMIT_EXCEEDED` at 50 active. |
| `PATCH` | `/api/v1/cv/:id` | Partial: any of `{title, templateId, data}`. Validates `data` against `cvDataSchema`. |
| `POST` | `/api/v1/cv/:id/move` | Body: `{folderId}`. Move to folder. Use this to soft-delete (move to Corbeille) and to restore (move out of it). |
| `DELETE` | `/api/v1/cv/:id` | Hard delete. 403 unless current `folderId` is Corbeille. |
| `POST` | `/api/v1/cv/import` | Body: `[{id, title, templateId, data, createdAt, updatedAt}]` (anon ids passed through for client mapping; server generates new cuids). Sorts by `updatedAt DESC`, clamps to remaining quota, lands all in "Mes CV". Returns `{imported: [{oldId, newId, title, templateId, updatedAt}], skipped: [{oldId, reason}]}`. |

### Folder endpoints (`server/src/routes/folders.ts` — new file)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/folders` | List all folders (system + custom). |
| `POST` | `/api/v1/folders` | Body: `{name}`. 409 on case-folded conflict or 20-folder cap. |
| `PATCH` | `/api/v1/folders/:id` | Body: `{name}`. 403 on system folders. 409 on conflict. |
| `DELETE` | `/api/v1/folders/:id` | Body: `{moveCvsTo: folderId}` (server reassigns CVs in same transaction). 403 on system. |

### Quotas

- Active CVs: `count where userId AND folder NOT system-trash` ≤ 50.
- Trashed CVs: `count where userId AND folder = system-trash` ≤ 50.
- Custom folders: 20 (system folders not counted).
- Folder name: 1–64 chars after trim. Case-folded unique per user.

## Client adapter implementation

```
client/src/features/cv-library/
  store/
    types.ts              ← CvStore + Folder + SyncStatus types
    LocalCvStore.ts
    DbCvStore.ts
    index.ts              ← createCvStore({ kind, sub })
  hooks/
    useCvStore.ts         ← picks impl by isAuthenticated + sub
    useCvLibrary.ts       ← list + folder ops + status subscription
  components/
    ImportLocalCvsModal.tsx
    FolderHeader.tsx
    CvContextMenu.tsx
    DeleteFolderModal.tsx
    SyncStatusBadge.tsx
  storage.ts              ← refactored into LocalCvStore primitives
```

### Interface

```ts
type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

interface CvStore {
  // Folders
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  deleteFolder(id: string, moveCvsTo: string): Promise<void>;

  // CVs
  listActive(): Promise<CvLibraryRecord[]>;
  listTrash(): Promise<CvLibraryRecord[]>;
  read(id: string): Promise<CvData | null>;
  create(record: NewCvRecord, body: CvData): Promise<CvLibraryRecord>;
  patch(id: string, partial: Partial<{title: string; templateId: TemplateId; data: CvData}>): Promise<CvLibraryRecord>;
  moveCv(id: string, folderId: string): Promise<void>;
  hardDeleteCv(id: string): Promise<void>;
  bulkImport(records: AnonExport[]): Promise<{ imported: number; skipped: number }>;

  // Status stream
  subscribeStatus(cb: (s: SyncStatus) => void): () => void;
}
```

`LocalCvStore` returns `Promise.resolve` for everything for interface
parity. Anon doesn't expose folder UI — `listFolders` returns `[]`,
folder mutators throw `NotSupported`. The library hook gates folder
features on auth state.

`DbCvStore` is the only impl with non-trivial async behavior (queue,
backoff, status stream).

### `useCvDraft` refactor

Replace direct `safeStorage()` calls with `store.patch(id, { data })`.
Wire `store.subscribeStatus` into the existing `persistStatus` state
so the UI sees `offline` and `error` states beyond what local-only
ever produced.

### Identity-keyed store memoization

```ts
export function useCvStore(): CvStore {
  const { isAuthenticated, user } = useAuth0();
  return useMemo(
    () => createCvStore({ kind: isAuthenticated ? "db" : "local", sub: user?.sub }),
    [isAuthenticated, user?.sub],
  );
}
```

`AuthGate`'s sticky pattern (ticket 1) prevents thrashing during
silent token refresh.

## UI surfaces

### Sidebar layout (signed-in)

```
┌─ EditorSidebar
│  Brand
│  + Nouveau CV
│
│  ▾ MES CV (3)
│    01 Mon CV
│    02 Junior CV
│    03 Senior CV
│
│  ▸ ALTERNANCE 2026 (2)
│  ▸ FREELANCE (1)
│
│  + Nouveau dossier
│
│  ▾ CORBEILLE (2)              ← always last, system
│    ⌫ Old CV   il y a 5j
│    ⌫ Test     il y a 12j
│
│  [auth slot]
│  [collapse]
└─
```

- Folder headers toggle expand/collapse. Expansion state persisted
  per-user in `cvie.editor.folders.collapsed.<sub>`.
- "+ Nouveau dossier" inline input → `POST /folders`. Conflict
  surfaces inline, not as a toast.
- Right-click on a CV: context menu → `Déplacer vers ▶` (folder list) +
  `Mettre à la corbeille`.
- Right-click on a CV in Corbeille: `Restaurer vers ▶` + `Supprimer définitivement`.
- Right-click on a custom folder header: `Renommer` + `Supprimer`.
- `Renommer` is inline; `Supprimer` opens `DeleteFolderModal` ("Déplacer
  N CV vers… [Mes CV ▾]").
- System folders have no rename/delete affordance.

### Sidebar layout (anonymous)

Existing flat list. No folder headers, no Corbeille section, no folder
controls. Right-click on a CV → confirm modal → hard delete from
localStorage. Functionally a strict subset of the authed UI.

### Migration prompt

`ImportLocalCvsModal.tsx` opens when:
- `useMe` reports a signed-in user
- `LocalCvStore` (anon namespace) has CVs whose ids are not in
  `cvie.migration.imported_ids[<sub>]`
- The `cvie.migration.dismissed_for.<sub>` flag is not set

```
┌─ Importer vos CV locaux ?────────────────────┐
│ Vous avez 3 CV enregistrés sur cet appareil. │
│ Voulez-vous les importer dans votre compte ? │
│                                              │
│ ☐ Ne plus me demander                        │
│                                              │
│           [Plus tard]   [Importer]           │
└──────────────────────────────────────────────┘
```

- `Importer` → `store.bulkImport(records)`. Server generates new cuids,
  returns `[{oldId, newId, title, …}]`. Client adds each `oldId` to
  `imported_ids[<sub>]`. Toast `N CV importés`. Anon copies remain in
  localStorage (untouched).
- `Plus tard` → close, no flag set, prompt next sign-in.
- "Ne plus demander" + close → set `dismissed_for.<sub>=true`.

The modal is **blocking** on its first appearance per session: it sits
on top of the editor with no outside-click dismissal. A user who
chooses `Plus tard` then sees the DB library (empty on a fresh account).
A persistent **"+ Importer depuis cet appareil"** button below the
folder list re-opens the modal whenever
`anonRecords.filter(r => !imported_ids[<sub>].has(r.id)).length > 0`.

If the user dismisses with "Ne plus demander", the persistent button
is hidden too. They can still create or paste content into new
DB-backed CVs.

### Import quota order

When the server clamps to remaining quota, anon records are sorted by
`updatedAt DESC` (most recent first). The first `min(N, remaining)`
land in "Mes CV"; the rest are reported as skipped with reason
`LIMIT`. This guarantees the user keeps their freshest work without
having to pre-prune locally.

### Sync status badge

Replace the static "BROUILLON ENREGISTRÉ LOCALEMENT" header label in
`CvEditor` with `SyncStatusBadge`, driven by `store.subscribeStatus`:

| Status | Label | Visual |
|---|---|---|
| `saving` | Enregistrement… | spinner, ink-soft |
| `saved` (anon) | Brouillon enregistré | check, ink-soft |
| `saved` (authed) | Enregistré | check, ink-soft |
| `offline` | Hors-ligne · synchronisation en attente | wifi-off, amber |
| `error` | Échec de la synchro · Recharger | alert, red, click → reload |

Anon `LocalCvStore` only emits `saving` and `saved`.

## Error handling

| Scenario | Server | Client |
|---|---|---|
| Validation fail (Zod) | 400 `VALIDATION_FAILED` | Dev console only (shouldn't reach prod). |
| Body too large | 413 `PAYLOAD_TOO_LARGE` | Status `error` for that CV. Toast: "CV trop volumineux pour la synchronisation." |
| Active cap | 409 `LIMIT_EXCEEDED` | Block create. Toast: "Limite atteinte (50 CVs). Videz la corbeille ou supprimez un CV." |
| Trash cap | 409 `LIMIT_EXCEEDED` | Block move-to-trash. Toast: "Corbeille pleine. Videz-la avant de continuer." |
| Folder name conflict | 409 `FOLDER_NAME_CONFLICT` | Inline: "Ce nom est déjà utilisé." |
| Custom folder cap | 409 `FOLDER_LIMIT_EXCEEDED` | Toast: "Maximum 20 dossiers." |
| 401 (token rejected) | 401 `UNAUTHENTICATED` | Halt queue, banner: "Session expirée — reconnectez-vous." |
| Network failure | n/a | Backoff. Status `offline`. Flush on `online` event. |
| Server 5xx | 500 `INTERNAL` | Retry up to 5 times, then `error`. Badge surfaces "Échec de synchronisation". |
| 404 on PATCH (race) | 404 `NOT_FOUND` | Drop pending writes for that id. Refresh list. Toast: "Ce CV n'existe plus." |

### Edge cases

- **Anon → authed mid-edit.** The currently-open CV is anon-owned
  (random local id, no DB row). Sign-in completes, `useCvStore` swaps
  to `DbCvStore`, ImportPromptModal opens and blocks until the user
  decides. The active CV is **not** auto-promoted to DB — its id never
  existed server-side. If the user clicks `Importer`, the active CV is
  among the imported records and the editor URL updates to its newly
  assigned `newId`. If the user clicks `Plus tard`, the editor closes
  the active CV (router gate redirects to the DB library; `Importer
  depuis cet appareil` button stays available). RHF state of the
  no-longer-mounted anon CV is discarded — that's expected, the user
  chose not to migrate it.
- **Authed → anon (logout).** Editor unmounts (ticket 1 logout fix).
  On home, `useCvStore` returns `LocalCvStore`. Existing anon CVs
  reappear; DB cache for the previous identity is cleared.
- **Two-tab edits, same device, signed-in.** Both tabs PATCH server.
  Last write wins per Q3a. `storage` event listener on the per-identity
  cache namespace keeps both tabs' caches consistent.
- **Restore when target folder full.** Server returns 409. UI: "Limite
  atteinte. Supprimez un CV avant de restaurer."
- **Delete folder containing CVs.** Modal asks "Déplacer N CV vers…",
  default "Mes CV". Server transaction reassigns CVs and deletes the
  folder. Reassign-to-Corbeille effectively soft-deletes (fresh TTL).
- **Quota on import.** Anon library has 5, server has 48 → import 2,
  return `{imported: 2, skipped: 3, reason: "LIMIT"}`. Toast informs.
- **Body schema drift.** `data` validated by `cvDataSchema.safeParse`
  on read. Failures log + return raw JSON; client schema controls.
  Optional fields stay backward-compatible.

## Testing strategy

### Server (bun:test)

- `services/cvService.test.ts` — quota enforcement, move semantics,
  hard-delete restricted to Corbeille, bulk import clamping.
- `services/folderService.test.ts` — name uniqueness (case-folded),
  20-folder cap, system-folder protection, transactional reassignment.
- `services/userService.test.ts` — extend to cover system-folder
  seeding on first user creation.
- `routes/__tests__/cv.test.ts` — auth gating, validation, body limit,
  move/delete flows over HTTP.
- `routes/__tests__/folders.test.ts` — full CRUD over HTTP.

### Client (vitest)

- `store/LocalCvStore.test.ts` — namespacing, status stream, migration
  preserves existing localStorage keys.
- `store/DbCvStore.test.ts` (mocked fetch) — dual-write, queue
  collapsing, backoff, `online`-event flush, 401 halts queue, 409
  surfaces error without dirtying cache, list refreshes drop stale ids.
- `hooks/useCvStore.test.ts` — store swap on auth state change, sub
  change rebuilds store.
- `components/__tests__/ImportLocalCvsModal.test.tsx` — render gate,
  import call, dismissal flag.
- `components/__tests__/EditorSidebar.folders.test.tsx` — folder
  hierarchy, context menus, move flow, anon flat-list parity.

### Manual smoke (added to plan's smoke checklist)

- Sign in fresh → modal → import 3 anon CVs → DB has them, sidebar
  reflects, anon copies still present after logout.
- Create folder, move CV, rename folder, delete folder w/ reassign.
- Soft-delete CV → appears in Corbeille → restore.
- Hit 50-active cap → toast.
- Multi-tab edit → last-write-wins observable.
- Throttle DevTools → Offline → status badge → reconnect → flush.
- Backdate `updated_at` for trashed CV, run `SELECT purge_trashed_cvs()`,
  verify gone.

## File-level scope summary

**Created:**

- `prisma/migrations/<ts>_create_cv_and_folder/migration.sql`
- `prisma/migrations/<ts>_pg_cron_purge_trashed_cvs/migration.sql`
- `server/src/services/cvService.ts` (+ test)
- `server/src/services/folderService.ts` (+ test)
- `server/src/routes/folders.ts` (+ test)
- `client/src/features/cv-library/store/types.ts`
- `client/src/features/cv-library/store/LocalCvStore.ts` (+ test)
- `client/src/features/cv-library/store/DbCvStore.ts` (+ test)
- `client/src/features/cv-library/store/index.ts`
- `client/src/features/cv-library/hooks/useCvStore.ts` (+ test)
- `client/src/features/cv-library/hooks/useCvLibrary.ts`
- `client/src/features/cv-library/components/ImportLocalCvsModal.tsx` (+ test)
- `client/src/features/cv-library/components/FolderHeader.tsx`
- `client/src/features/cv-library/components/CvContextMenu.tsx`
- `client/src/features/cv-library/components/DeleteFolderModal.tsx`
- `client/src/features/cv-library/components/SyncStatusBadge.tsx`

**Modified:**

- `prisma/schema.prisma` — add `Cv`, `Folder`, relations on `User`.
- `server/src/services/userService.ts` — seed system folders on user create.
- `server/src/routes/cv.ts` — extend with new CV routes (existing PDF route stays anon).
- `server/src/index.ts` — mount `/api/v1/folders`.
- `client/src/features/cv-library/storage.ts` — refactor into `LocalCvStore` primitives.
- `client/src/features/editor/hooks/useCvDraft.ts` — consume `store.patch`.
- `client/src/features/editor/components/EditorSidebar.tsx` — folder UI for authed users; existing flat list for anon.
- `client/src/features/editor/components/CvEditor.tsx` — replace static status label with `SyncStatusBadge`.
- `client/src/router.tsx` — gate auto-create flow through the store; ImportPromptModal mount point.
