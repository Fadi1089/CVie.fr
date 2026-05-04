# CV DB Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CV records from per-browser localStorage into Postgres for signed-in users, scoped to the user's account, with a flat folder organization layer (including a system "Corbeille" folder with 30-day TTL). Anonymous flow stays untouched.

**Architecture:** Single `CvStore` interface with two implementations. `LocalCvStore` wraps localStorage (anon + cache). `DbCvStore` writes through to a per-identity localStorage cache, then PATCHes a Hono REST API. Auto-save is dual-write with a queue + exponential backoff. Server validates CV bodies against `cvDataSchema` (Zod). `pg_cron` purges trashed CVs older than 30 days.

**Tech Stack:** Bun + Hono + Prisma 7 + Postgres (Supabase) + React 19 + Vite + RHF + base-ui + Tailwind 4 + vitest + bun:test.

**Spec:** `docs/superpowers/specs/2026-05-01-cv-db-persistence-design.md`

---

## File structure

**New files:**

- `prisma/migrations/<ts>_create_cv_and_folder/migration.sql`
- `prisma/migrations/<ts>_pg_cron_purge_trashed_cvs/migration.sql`
- `server/src/services/folderService.ts` (+ `__tests__/folderService.test.ts`)
- `server/src/services/cvService.ts` (+ `__tests__/cvService.test.ts`)
- `server/src/routes/folders.ts` (+ `__tests__/folders.test.ts`)
- `client/src/features/cv-library/store/types.ts`
- `client/src/features/cv-library/store/LocalCvStore.ts` (+ test)
- `client/src/features/cv-library/store/DbCvStore.ts` (+ test)
- `client/src/features/cv-library/store/index.ts`
- `client/src/features/cv-library/hooks/useCvStore.ts` (+ test)
- `client/src/features/cv-library/hooks/useCvLibrary.ts`
- `client/src/features/cv-library/components/SyncStatusBadge.tsx`
- `client/src/features/cv-library/components/ImportLocalCvsModal.tsx` (+ test)
- `client/src/features/cv-library/components/FolderHeader.tsx`
- `client/src/features/cv-library/components/CvContextMenu.tsx`
- `client/src/features/cv-library/components/DeleteFolderModal.tsx`

**Modified:**

- `prisma/schema.prisma` — add `Cv`, `Folder`, relations on `User`.
- `server/src/services/userService.ts` — seed system folders on user create.
- `server/src/services/__tests__/userService.test.ts` — cover seeding.
- `server/src/services/index.ts` — re-export new services.
- `server/src/routes/cv.ts` — extend with new CV routes (existing PDF route unchanged).
- `server/src/routes/index.ts` — re-export folder routes.
- `server/src/index.ts` — mount `/api/v1/folders`.
- `client/src/features/cv-library/storage.ts` — refactored into `LocalCvStore` primitives.
- `client/src/features/editor/hooks/useCvDraft.ts` — consume `store.patch`.
- `client/src/features/editor/components/EditorSidebar.tsx` — folder UI for authed; flat list for anon.
- `client/src/features/editor/components/CvEditor.tsx` — replace static status label with `SyncStatusBadge`.
- `client/src/router.tsx` — gate auto-create through store; mount `ImportLocalCvsModal`.

---

## Task 1: Prisma schema — add `Cv` and `Folder` models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_create_cv_and_folder/migration.sql`

- [ ] **Step 1: Update `prisma/schema.prisma`** (final state):

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

model User {
  id           String    @id @default(cuid())
  auth0Sub     String    @unique @map("auth0_sub")
  email        String    @unique
  username     String?   @unique
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  cvs     Cv[]
  folders Folder[]

  @@map("users")
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

  cvs Cv[]

  @@unique([userId, name])
  @@map("folders")
}

model Cv {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  folderId   String   @map("folder_id")
  folder     Folder   @relation(fields: [folderId], references: [id])
  title      String
  templateId String   @map("template_id")
  data       Json
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([userId, folderId, updatedAt(sort: Desc)])
  @@map("cvs")
}
```

- [ ] **Step 2: Generate the migration**

```bash
cd /Users/fadi/test_bmad/cvie-fr
DATABASE_URL="$DIRECT_URL" bunx prisma migrate dev --name create_cv_and_folder --create-only
```

Expected: new directory under `prisma/migrations/<ts>_create_cv_and_folder/` with `migration.sql`. The `--create-only` flag prevents auto-apply on the dev DB.

- [ ] **Step 3: Inspect the generated SQL**

Open `prisma/migrations/<ts>_create_cv_and_folder/migration.sql`. Verify it creates `folders` and `cvs` tables, the `(user_id, folder_id, updated_at DESC)` index on `cvs`, and the unique `(user_id, name)` constraint on `folders`. If anything is missing, hand-edit (Prisma sometimes lays down indexes in awkward order — that's OK).

- [ ] **Step 4: Apply the migration to the dev DB**

```bash
DATABASE_URL="$DIRECT_URL" bunx prisma migrate deploy
```

Expected: `Applied 1 migration`.

- [ ] **Step 5: Regenerate Prisma client**

```bash
DATABASE_URL="$DIRECT_URL" bunx prisma generate
```

Expected: `✔ Generated Prisma Client`.

- [ ] **Step 6: Type-check the workspace**

```bash
bun run type-check
```

Expected: clean. No code changes yet, so this just confirms the regenerated client integrates.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add Cv and Folder models"
```

---

## Task 2: `pg_cron` purge migration

**Files:**
- Create: `prisma/migrations/<ts>_pg_cron_purge_trashed_cvs/migration.sql`

- [ ] **Step 1: Create the migration directory + file**

```bash
TS=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_pg_cron_purge_trashed_cvs"
```

- [ ] **Step 2: Write the SQL**

`prisma/migrations/<ts>_pg_cron_purge_trashed_cvs/migration.sql`:

```sql
-- pg_cron is provided by Supabase. Locally this migration is a no-op
-- if the extension isn't available; the function definition still
-- succeeds because it has no side effects until called.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION purge_trashed_cvs() RETURNS void AS $$
  DELETE FROM cvs WHERE folder_id IN (
    SELECT id FROM folders
    WHERE is_system = true AND ttl_days IS NOT NULL
  )
  AND updated_at < NOW() - INTERVAL '30 days';
$$ LANGUAGE sql;

-- Idempotent schedule registration.
SELECT cron.unschedule('cvie-purge-trashed-cvs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cvie-purge-trashed-cvs');

SELECT cron.schedule(
  'cvie-purge-trashed-cvs',
  '0 3 * * *',
  'SELECT purge_trashed_cvs()'
);
```

- [ ] **Step 3: Apply against dev DB**

```bash
DATABASE_URL="$DIRECT_URL" bunx prisma migrate deploy
```

Expected: `Applied 1 migration`. If `pg_cron` isn't installed locally, expect errors on the `CREATE EXTENSION` line — in that case wrap it in a `DO $$ BEGIN … EXCEPTION WHEN undefined_file THEN NULL; END $$;` block. Log into Supabase SQL Editor for prod to verify the cron job appears in `cron.job`.

- [ ] **Step 4: Verify the function works**

```bash
DATABASE_URL="$DIRECT_URL" bunx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT purge_trashed_cvs();
SELECT * FROM cron.job WHERE jobname = 'cvie-purge-trashed-cvs';
SQL
```

Expected: function call returns void, cron.job row visible.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations
git commit -m "feat(db): pg_cron job to purge trashed CVs after 30 days"
```

---

## Task 3: `folderService` — create + system seeding

**Files:**
- Create: `server/src/services/folderService.ts`
- Create: `server/src/services/__tests__/folderService.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/services/__tests__/folderService.test.ts`:

```ts
import { describe, expect, it, mock, beforeEach } from "bun:test";

const findManyMock = mock(async (_args: unknown) => [] as unknown[]);
const findUniqueMock = mock(async (_args: unknown) => null as unknown);
const createMock = mock(async (args: { data: Record<string, unknown> }) => ({
  id: "f_new",
  ...args.data,
  isSystem: args.data.isSystem ?? false,
  ttlDays: args.data.ttlDays ?? null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const createManyMock = mock(async (_args: unknown) => ({ count: 2 }));
const transactionMock = mock(async (cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
    },
  }),
);

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
    },
    $transaction: transactionMock,
  },
}));

import {
  createFolder,
  seedSystemFolders,
  FolderError,
} from "../folderService";

describe("folderService", () => {
  beforeEach(() => {
    findManyMock.mockClear();
    findUniqueMock.mockClear();
    createMock.mockClear();
    createManyMock.mockClear();
  });

  describe("seedSystemFolders", () => {
    it("creates 'Mes CV' and 'Corbeille' for a new user", async () => {
      await seedSystemFolders("u_1");
      expect(createManyMock).toHaveBeenCalledTimes(1);
      const call = createManyMock.mock.calls[0]?.[0] as {
        data: Array<{ userId: string; name: string; isSystem: boolean; ttlDays: number | null }>;
      };
      expect(call.data).toHaveLength(2);
      expect(call.data[0]).toMatchObject({
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      expect(call.data[1]).toMatchObject({
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
    });
  });

  describe("createFolder", () => {
    it("creates a custom folder when name is unique and quota not full", async () => {
      findManyMock.mockResolvedValueOnce([]);
      findUniqueMock.mockResolvedValueOnce(null);
      const folder = await createFolder("u_1", "Alternance");
      expect(folder.name).toBe("Alternance");
      expect(createMock).toHaveBeenCalledTimes(1);
      const call = createMock.mock.calls[0]?.[0] as {
        data: { userId: string; name: string; isSystem: boolean };
      };
      expect(call.data.userId).toBe("u_1");
      expect(call.data.isSystem).toBe(false);
    });

    it("trims whitespace from folder name", async () => {
      findManyMock.mockResolvedValueOnce([]);
      findUniqueMock.mockResolvedValueOnce(null);
      const folder = await createFolder("u_1", "  Alternance  ");
      expect(folder.name).toBe("Alternance");
    });

    it("rejects empty names", async () => {
      await expect(createFolder("u_1", "   ")).rejects.toMatchObject({
        code: "VALIDATION",
      });
    });

    it("rejects names longer than 64 characters", async () => {
      await expect(createFolder("u_1", "x".repeat(65))).rejects.toMatchObject({
        code: "VALIDATION",
      });
    });

    it("rejects case-folded duplicates", async () => {
      findManyMock.mockResolvedValueOnce([{ id: "f_1", name: "alternance" }]);
      await expect(createFolder("u_1", "Alternance")).rejects.toMatchObject({
        code: "FOLDER_NAME_CONFLICT",
      });
    });

    it("rejects creation past 20 custom folders", async () => {
      findManyMock.mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, i) => ({ id: `f_${i}`, name: `n${i}` })),
      );
      await expect(createFolder("u_1", "Twenty-first")).rejects.toMatchObject({
        code: "FOLDER_LIMIT_EXCEEDED",
      });
    });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
cd /Users/fadi/test_bmad/cvie-fr/server
bun test --preload ./test-setup.ts src/services/__tests__/folderService.test.ts
```

Expected: cannot resolve `../folderService`.

- [ ] **Step 3: Implement `folderService.ts`**

`server/src/services/folderService.ts`:

```ts
import { prisma } from "../lib/prisma";
import type { Folder } from "../../../prisma/generated/prisma/client";

export type FolderRow = Folder;

export const SYSTEM_FOLDER_DEFAULT = "Mes CV";
export const SYSTEM_FOLDER_TRASH = "Corbeille";
export const TRASH_TTL_DAYS = 30;
export const MAX_CUSTOM_FOLDERS = 20;
export const MAX_FOLDER_NAME_LENGTH = 64;

type FolderErrorCode =
  | "VALIDATION"
  | "FOLDER_NAME_CONFLICT"
  | "FOLDER_LIMIT_EXCEEDED"
  | "FOLDER_NOT_FOUND"
  | "FOLDER_IS_SYSTEM"
  | "TARGET_FOLDER_NOT_FOUND";

export class FolderError extends Error {
  constructor(public readonly code: FolderErrorCode, message: string) {
    super(message);
    this.name = "FolderError";
  }
}

function normalizeName(name: string): string {
  return name.trim();
}

function caseFold(s: string): string {
  return s.trim().toLocaleLowerCase("fr-FR");
}

/** Seeds "Mes CV" + "Corbeille" for a new user. Idempotent: caller is
 *  expected to call this exactly once on user creation. */
export async function seedSystemFolders(userId: string): Promise<void> {
  await prisma.folder.createMany({
    data: [
      {
        userId,
        name: SYSTEM_FOLDER_DEFAULT,
        isSystem: true,
        ttlDays: null,
      },
      {
        userId,
        name: SYSTEM_FOLDER_TRASH,
        isSystem: true,
        ttlDays: TRASH_TTL_DAYS,
      },
    ],
  });
}

export async function createFolder(
  userId: string,
  rawName: string,
): Promise<FolderRow> {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new FolderError(
      "VALIDATION",
      `Folder name must be between 1 and ${MAX_FOLDER_NAME_LENGTH} characters.`,
    );
  }

  const existing = await prisma.folder.findMany({
    where: { userId, isSystem: false },
    select: { id: true, name: true },
  });

  if (existing.length >= MAX_CUSTOM_FOLDERS) {
    throw new FolderError(
      "FOLDER_LIMIT_EXCEEDED",
      `Cannot create more than ${MAX_CUSTOM_FOLDERS} custom folders.`,
    );
  }

  const folded = caseFold(name);
  if (existing.some((f) => caseFold(f.name) === folded)) {
    throw new FolderError(
      "FOLDER_NAME_CONFLICT",
      "A folder with this name already exists.",
    );
  }

  return (await prisma.folder.create({
    data: { userId, name, isSystem: false, ttlDays: null },
  })) as FolderRow;
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/folderService.test.ts
```

Expected: 6 pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/folderService.ts server/src/services/__tests__/folderService.test.ts
git commit -m "feat(server): folderService with create + system folder seeding"
```

---

## Task 4: `folderService` — list, rename, delete with reassignment

**Files:**
- Modify: `server/src/services/folderService.ts`
- Modify: `server/src/services/__tests__/folderService.test.ts`

- [ ] **Step 1: Add failing tests**

Append inside `describe("folderService", () => { … })` in the test file:

```ts
  describe("listFolders", () => {
    it("returns all folders for a user", async () => {
      findManyMock.mockResolvedValueOnce([
        { id: "f_sys", name: "Mes CV", isSystem: true, ttlDays: null },
        { id: "f_trash", name: "Corbeille", isSystem: true, ttlDays: 30 },
        { id: "f_user", name: "Alternance", isSystem: false, ttlDays: null },
      ]);
      const folders = await listFolders("u_1");
      expect(folders).toHaveLength(3);
      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("renameFolder", () => {
    it("renames a custom folder when name is unique", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_1",
        name: "Old",
        isSystem: false,
        ttlDays: null,
      });
      findManyMock.mockResolvedValueOnce([]);
      const updateMock = mock(async () => ({
        id: "f_user",
        userId: "u_1",
        name: "New",
        isSystem: false,
        ttlDays: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mock.module("../../lib/prisma", () => ({
        prisma: {
          folder: {
            findMany: findManyMock,
            findUnique: findUniqueMock,
            update: updateMock,
            create: createMock,
            createMany: createManyMock,
          },
          $transaction: transactionMock,
        },
      }));
      // Re-import after mocking again
      const { renameFolder: rename } = await import("../folderService");
      const folder = await rename("u_1", "f_user", "New");
      expect(folder.name).toBe("New");
    });

    it("throws when folder is system-owned", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_sys",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      await expect(renameFolder("u_1", "f_sys", "Foo")).rejects.toMatchObject({
        code: "FOLDER_IS_SYSTEM",
      });
    });

    it("throws when folder belongs to another user", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_other",
        name: "X",
        isSystem: false,
        ttlDays: null,
      });
      await expect(renameFolder("u_1", "f_user", "Y")).rejects.toMatchObject({
        code: "FOLDER_NOT_FOUND",
      });
    });
  });

  describe("deleteFolder", () => {
    it("reassigns CVs and deletes folder in a transaction", async () => {
      const updateManyMock = mock(async () => ({ count: 3 }));
      const deleteMock = mock(async () => ({ id: "f_user" }));
      const txFindUnique = mock(async (args: { where: { id: string } }) => {
        if (args.where.id === "f_user") {
          return {
            id: "f_user",
            userId: "u_1",
            name: "Old",
            isSystem: false,
            ttlDays: null,
          };
        }
        return {
          id: "f_target",
          userId: "u_1",
          name: "Target",
          isSystem: false,
          ttlDays: null,
        };
      });
      mock.module("../../lib/prisma", () => ({
        prisma: {
          folder: {
            findMany: findManyMock,
            findUnique: findUniqueMock,
            update: mock(async () => ({})),
            create: createMock,
            createMany: createManyMock,
            delete: deleteMock,
          },
          cv: { updateMany: updateManyMock },
          $transaction: mock(async (cb: (tx: unknown) => Promise<unknown>) =>
            cb({
              folder: {
                findUnique: txFindUnique,
                delete: deleteMock,
              },
              cv: { updateMany: updateManyMock },
            }),
          ),
        },
      }));
      const { deleteFolder: del } = await import("../folderService");
      await del("u_1", "f_user", "f_target");
      expect(updateManyMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it("rejects deletion of system folder", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      await expect(
        deleteFolder("u_1", "f_trash", "f_target"),
      ).rejects.toMatchObject({ code: "FOLDER_IS_SYSTEM" });
    });
  });
```

Add the missing imports at the top:

```ts
import {
  createFolder,
  seedSystemFolders,
  listFolders,
  renameFolder,
  deleteFolder,
  FolderError,
} from "../folderService";
```

- [ ] **Step 2: Run tests, expect failure**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/folderService.test.ts
```

Expected: import fails (`listFolders`, `renameFolder`, `deleteFolder` not exported).

- [ ] **Step 3: Add implementations**

Append to `server/src/services/folderService.ts`:

```ts
export async function listFolders(userId: string): Promise<FolderRow[]> {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });
}

export async function renameFolder(
  userId: string,
  folderId: string,
  rawName: string,
): Promise<FolderRow> {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new FolderError(
      "VALIDATION",
      `Folder name must be between 1 and ${MAX_FOLDER_NAME_LENGTH} characters.`,
    );
  }

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) {
    throw new FolderError("FOLDER_NOT_FOUND", "Folder not found.");
  }
  if (folder.isSystem) {
    throw new FolderError(
      "FOLDER_IS_SYSTEM",
      "System folders cannot be renamed.",
    );
  }

  const folded = caseFold(name);
  const peers = await prisma.folder.findMany({
    where: { userId, NOT: { id: folderId } },
    select: { name: true },
  });
  if (peers.some((p) => caseFold(p.name) === folded)) {
    throw new FolderError(
      "FOLDER_NAME_CONFLICT",
      "A folder with this name already exists.",
    );
  }

  return prisma.folder.update({
    where: { id: folderId },
    data: { name },
  });
}

export async function deleteFolder(
  userId: string,
  folderId: string,
  moveCvsTo: string,
): Promise<void> {
  // Pre-flight checks outside the transaction so error codes are stable.
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) {
    throw new FolderError("FOLDER_NOT_FOUND", "Folder not found.");
  }
  if (folder.isSystem) {
    throw new FolderError(
      "FOLDER_IS_SYSTEM",
      "System folders cannot be deleted.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.folder.findUnique({ where: { id: moveCvsTo } });
    if (!target || target.userId !== userId) {
      throw new FolderError(
        "TARGET_FOLDER_NOT_FOUND",
        "Target folder not found.",
      );
    }
    await tx.cv.updateMany({
      where: { folderId, userId },
      data: { folderId: moveCvsTo },
    });
    await tx.folder.delete({ where: { id: folderId } });
  });
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/folderService.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/folderService.ts server/src/services/__tests__/folderService.test.ts
git commit -m "feat(server): folderService rename + delete with transactional reassign"
```

---

## Task 5: `cvService` — create, read, list, patch

**Files:**
- Create: `server/src/services/cvService.ts`
- Create: `server/src/services/__tests__/cvService.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/services/__tests__/cvService.test.ts`:

```ts
import { describe, expect, it, mock, beforeEach } from "bun:test";

const folderFindFirstMock = mock(async (_args: unknown) => null as unknown);
const cvFindUniqueMock = mock(async (_args: unknown) => null as unknown);
const cvFindManyMock = mock(async (_args: unknown) => [] as unknown[]);
const cvCountMock = mock(async (_args: unknown) => 0);
const cvCreateMock = mock(async (args: { data: Record<string, unknown> }) => ({
  id: "cv_new",
  ...args.data,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const cvUpdateMock = mock(async (args: { where: unknown; data: Record<string, unknown> }) => ({
  id: "cv_1",
  ...args.data,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: { findFirst: folderFindFirstMock },
    cv: {
      findUnique: cvFindUniqueMock,
      findMany: cvFindManyMock,
      count: cvCountMock,
      create: cvCreateMock,
      update: cvUpdateMock,
    },
  },
}));

import {
  createCv,
  readCv,
  listActiveCvs,
  listTrashCvs,
  patchCv,
  CvError,
} from "../cvService";

const SAMPLE_DATA = {
  personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

describe("cvService", () => {
  beforeEach(() => {
    folderFindFirstMock.mockClear();
    cvFindUniqueMock.mockClear();
    cvFindManyMock.mockClear();
    cvCountMock.mockClear();
    cvCreateMock.mockClear();
    cvUpdateMock.mockClear();
  });

  describe("createCv", () => {
    it("creates a CV in 'Mes CV' when folderId not provided", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      const cv = await createCv("u_1", {
        title: "Mon CV",
        templateId: "classique",
        data: SAMPLE_DATA,
      });
      expect(cv.id).toBe("cv_new");
      const call = cvCreateMock.mock.calls[0]?.[0] as {
        data: { folderId: string };
      };
      expect(call.data.folderId).toBe("f_default");
    });

    it("rejects when active count is at the cap", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(50);
      await expect(
        createCv("u_1", {
          title: "Too Many",
          templateId: "classique",
          data: SAMPLE_DATA,
        }),
      ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    });

    it("rejects invalid CV data via cvDataSchema", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      await expect(
        createCv("u_1", {
          title: "Bad",
          templateId: "classique",
          data: { personalInfo: {} },
        }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });
  });

  describe("readCv", () => {
    it("returns the CV when owned by user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const cv = await readCv("u_1", "cv_1");
      expect(cv?.id).toBe("cv_1");
    });

    it("returns null for another user's CV", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_other",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const cv = await readCv("u_1", "cv_1");
      expect(cv).toBeNull();
    });
  });

  describe("listActiveCvs / listTrashCvs", () => {
    it("listActive excludes Corbeille folder", async () => {
      cvFindManyMock.mockResolvedValueOnce([{ id: "cv_1" }]);
      await listActiveCvs("u_1");
      const call = cvFindManyMock.mock.calls[0]?.[0] as {
        where: { userId: string; folder: { isSystem: boolean; ttlDays: null } };
      };
      expect(call.where.userId).toBe("u_1");
      expect(call.where.folder).toBeDefined();
    });

    it("listTrash returns only trashed CVs", async () => {
      cvFindManyMock.mockResolvedValueOnce([{ id: "cv_2" }]);
      await listTrashCvs("u_1");
      const call = cvFindManyMock.mock.calls[0]?.[0] as {
        where: { userId: string; folder: { isSystem: boolean; ttlDays: { not: null } } };
      };
      expect(call.where.userId).toBe("u_1");
    });
  });

  describe("patchCv", () => {
    it("updates allowed fields", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f",
        title: "Old",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await patchCv("u_1", "cv_1", { title: "New" });
      const call = cvUpdateMock.mock.calls[0]?.[0] as { data: { title: string } };
      expect(call.data.title).toBe("New");
    });

    it("validates data against cvDataSchema when data is updated", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        patchCv("u_1", "cv_1", { data: { personalInfo: {} } }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });

    it("returns 'not found' when CV doesn't belong to user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_other",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        patchCv("u_1", "cv_1", { title: "X" }),
      ).rejects.toMatchObject({ code: "CV_NOT_FOUND" });
    });
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/cvService.test.ts
```

Expected: cannot resolve `../cvService`.

- [ ] **Step 3: Implement `cvService.ts`**

`server/src/services/cvService.ts`:

```ts
import { prisma } from "../lib/prisma";
import { cvDataSchema, type CvData, type TemplateId } from "@cvie/shared";
import {
  SYSTEM_FOLDER_DEFAULT,
  SYSTEM_FOLDER_TRASH,
} from "./folderService";
import type { Cv } from "../../../prisma/generated/prisma/client";

export type CvRow = Cv;

export const MAX_ACTIVE_CVS = 50;
export const MAX_TRASHED_CVS = 50;

type CvErrorCode =
  | "VALIDATION"
  | "LIMIT_EXCEEDED"
  | "CV_NOT_FOUND"
  | "TARGET_FOLDER_NOT_FOUND"
  | "HARD_DELETE_REQUIRES_TRASH";

export class CvError extends Error {
  constructor(public readonly code: CvErrorCode, message: string) {
    super(message);
    this.name = "CvError";
  }
}

export type CreateCvInput = {
  title: string;
  templateId: TemplateId;
  data: unknown;
  folderId?: string;
};

async function getDefaultFolder(userId: string) {
  return prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_DEFAULT },
  });
}

async function getTrashFolder(userId: string) {
  return prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
}

export async function createCv(
  userId: string,
  input: CreateCvInput,
): Promise<CvRow> {
  const default_ = await getDefaultFolder(userId);
  if (!default_) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Default folder missing for user — seeding never ran.",
    );
  }

  const active = await prisma.cv.count({
    where: {
      userId,
      folder: { isSystem: true, ttlDays: null },
    },
  });
  if (active >= MAX_ACTIVE_CVS) {
    throw new CvError(
      "LIMIT_EXCEEDED",
      `Active CV limit (${MAX_ACTIVE_CVS}) reached.`,
    );
  }

  const parsed = cvDataSchema.safeParse(input.data);
  if (!parsed.success) {
    throw new CvError("VALIDATION", "CV data failed schema validation.");
  }

  const targetFolderId = input.folderId ?? default_.id;

  return prisma.cv.create({
    data: {
      userId,
      folderId: targetFolderId,
      title: input.title,
      templateId: input.templateId,
      data: parsed.data as unknown as object,
    },
  });
}

export async function readCv(userId: string, cvId: string): Promise<CvRow | null> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) return null;
  return cv;
}

export async function listActiveCvs(userId: string): Promise<CvRow[]> {
  return prisma.cv.findMany({
    where: {
      userId,
      folder: { isSystem: true, ttlDays: null },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listTrashCvs(userId: string): Promise<CvRow[]> {
  return prisma.cv.findMany({
    where: {
      userId,
      folder: { isSystem: true, ttlDays: { not: null } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export type CvPatch = Partial<{
  title: string;
  templateId: TemplateId;
  data: unknown;
}>;

export async function patchCv(
  userId: string,
  cvId: string,
  patch: CvPatch,
): Promise<CvRow> {
  const existing = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!existing || existing.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.templateId !== undefined) data.templateId = patch.templateId;
  if (patch.data !== undefined) {
    const parsed = cvDataSchema.safeParse(patch.data);
    if (!parsed.success) {
      throw new CvError("VALIDATION", "CV data failed schema validation.");
    }
    data.data = parsed.data as unknown as object;
  }

  return prisma.cv.update({
    where: { id: cvId },
    data,
  });
}
```

Note: `listActiveCvs` query selector deviates slightly from the test — Prisma's relation filter syntax is `folder: { isSystem: true, ttlDays: null }` (active = system folder with `ttlDays: null` covers "Mes CV"; user-created folders also need to be active). Update the implementation to also include user folders (non-system):

```ts
export async function listActiveCvs(userId: string): Promise<CvRow[]> {
  return prisma.cv.findMany({
    where: {
      userId,
      OR: [
        { folder: { isSystem: false } },
        { folder: { isSystem: true, ttlDays: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

Update the corresponding test assertion to be loose (just check `userId` matches and the where clause has either an `OR` or `folder` key):

```ts
    it("listActive includes both 'Mes CV' and custom folders, excludes trash", async () => {
      cvFindManyMock.mockResolvedValueOnce([{ id: "cv_1" }]);
      await listActiveCvs("u_1");
      const call = cvFindManyMock.mock.calls[0]?.[0] as {
        where: { userId: string; OR: unknown[] };
      };
      expect(call.where.userId).toBe("u_1");
      expect(Array.isArray(call.where.OR)).toBe(true);
    });
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/cvService.test.ts
```

Expected: all pass. If `cvDataSchema` import fails, ensure `@cvie/shared` is built (`bun run --filter=@cvie/shared build`) and `tsconfig` paths resolve in tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cvService.ts server/src/services/__tests__/cvService.test.ts
git commit -m "feat(server): cvService with create + read + list + patch"
```

---

## Task 6: `cvService` — move, hard-delete, bulkImport

**Files:**
- Modify: `server/src/services/cvService.ts`
- Modify: `server/src/services/__tests__/cvService.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `cvService.test.ts`, inside the `describe("cvService", …)` block:

```ts
  describe("moveCv", () => {
    it("moves CV to target folder owned by same user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_old",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_target",
        userId: "u_1",
        name: "Target",
        isSystem: false,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      await moveCv("u_1", "cv_1", "f_target");
      expect(cvUpdateMock).toHaveBeenCalledTimes(1);
      const call = cvUpdateMock.mock.calls[0]?.[0] as {
        data: { folderId: string };
      };
      expect(call.data.folderId).toBe("f_target");
    });

    it("rejects move to another user's folder", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce(null);
      await expect(moveCv("u_1", "cv_1", "f_other")).rejects.toMatchObject({
        code: "TARGET_FOLDER_NOT_FOUND",
      });
    });

    it("rejects restore from trash when active cap reached", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_trash",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock
        .mockResolvedValueOnce({
          id: "f_target",
          userId: "u_1",
          name: "Mes CV",
          isSystem: true,
          ttlDays: null,
        })
        .mockResolvedValueOnce({
          id: "f_trash",
          userId: "u_1",
          name: "Corbeille",
          isSystem: true,
          ttlDays: 30,
        });
      cvCountMock.mockResolvedValueOnce(50);
      await expect(moveCv("u_1", "cv_1", "f_target")).rejects.toMatchObject({
        code: "LIMIT_EXCEEDED",
      });
    });
  });

  describe("hardDeleteCv", () => {
    it("hard-deletes CV that lives in Corbeille", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_trash",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      const deleteMock = mock(async () => ({ id: "cv_1" }));
      mock.module("../../lib/prisma", () => ({
        prisma: {
          folder: { findFirst: folderFindFirstMock },
          cv: {
            findUnique: cvFindUniqueMock,
            findMany: cvFindManyMock,
            count: cvCountMock,
            create: cvCreateMock,
            update: cvUpdateMock,
            delete: deleteMock,
            createMany: mock(async () => ({ count: 0 })),
          },
        },
      }));
      const { hardDeleteCv: del } = await import("../cvService");
      await del("u_1", "cv_1");
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it("rejects hard-delete when CV is not in Corbeille", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      await expect(hardDeleteCv("u_1", "cv_1")).rejects.toMatchObject({
        code: "HARD_DELETE_REQUIRES_TRASH",
      });
    });
  });

  describe("bulkImportCvs", () => {
    it("imports records sorted by updatedAt desc, clamped to remaining quota", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(48);
      const createManyMock = mock(async (args: { data: unknown[] }) => ({
        count: args.data.length,
      }));
      const findManyAfterMock = mock(async () => [
        { id: "cv_a", title: "A", templateId: "classique", folderId: "f_default", updatedAt: new Date() },
        { id: "cv_b", title: "B", templateId: "classique", folderId: "f_default", updatedAt: new Date() },
      ]);
      mock.module("../../lib/prisma", () => ({
        prisma: {
          folder: { findFirst: folderFindFirstMock },
          cv: {
            findUnique: cvFindUniqueMock,
            findMany: findManyAfterMock,
            count: cvCountMock,
            create: cvCreateMock,
            update: cvUpdateMock,
            createMany: createManyMock,
          },
        },
      }));
      const { bulkImportCvs: bulk } = await import("../cvService");
      const result = await bulk("u_1", [
        { id: "old1", title: "Old", templateId: "classique", data: SAMPLE_DATA, updatedAt: new Date(2020, 0, 1).toISOString() },
        { id: "new1", title: "Newer", templateId: "classique", data: SAMPLE_DATA, updatedAt: new Date(2025, 0, 1).toISOString() },
        { id: "newest", title: "Newest", templateId: "classique", data: SAMPLE_DATA, updatedAt: new Date(2026, 0, 1).toISOString() },
      ]);
      // Quota leaves room for 2 (50 - 48). Newest two land, oldest skipped.
      expect(result.imported.length).toBe(2);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0]?.oldId).toBe("old1");
    });

    it("skips records that fail schema validation", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      const createManyMock = mock(async (args: { data: unknown[] }) => ({
        count: args.data.length,
      }));
      const findManyAfterMock = mock(async () => []);
      mock.module("../../lib/prisma", () => ({
        prisma: {
          folder: { findFirst: folderFindFirstMock },
          cv: {
            findUnique: cvFindUniqueMock,
            findMany: findManyAfterMock,
            count: cvCountMock,
            create: cvCreateMock,
            update: cvUpdateMock,
            createMany: createManyMock,
          },
        },
      }));
      const { bulkImportCvs: bulk } = await import("../cvService");
      const result = await bulk("u_1", [
        { id: "bad", title: "Bad", templateId: "classique", data: { personalInfo: {} }, updatedAt: new Date().toISOString() },
      ]);
      expect(result.imported.length).toBe(0);
      expect(result.skipped[0]?.reason).toBe("VALIDATION");
    });
  });
```

Update the imports line:

```ts
import {
  createCv,
  readCv,
  listActiveCvs,
  listTrashCvs,
  patchCv,
  moveCv,
  hardDeleteCv,
  bulkImportCvs,
  CvError,
} from "../cvService";
```

- [ ] **Step 2: Run tests, expect failure**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/cvService.test.ts
```

Expected: import errors for `moveCv`, `hardDeleteCv`, `bulkImportCvs`.

- [ ] **Step 3: Append to `cvService.ts`**

Add to `server/src/services/cvService.ts`:

```ts
export async function moveCv(
  userId: string,
  cvId: string,
  targetFolderId: string,
): Promise<CvRow> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const targetFolder = await prisma.folder.findFirst({
    where: { id: targetFolderId, userId },
  });
  if (!targetFolder) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Target folder not found.",
    );
  }

  // Restore guard: if moving FROM trash to active, enforce active cap.
  const trash = await prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
  const isComingFromTrash = trash !== null && cv.folderId === trash.id;
  const isMovingToActive =
    !targetFolder.isSystem || targetFolder.ttlDays === null;
  if (isComingFromTrash && isMovingToActive) {
    const active = await prisma.cv.count({
      where: {
        userId,
        OR: [
          { folder: { isSystem: false } },
          { folder: { isSystem: true, ttlDays: null } },
        ],
      },
    });
    if (active >= MAX_ACTIVE_CVS) {
      throw new CvError(
        "LIMIT_EXCEEDED",
        "Cannot restore: active CV limit reached.",
      );
    }
  }

  // Move-to-trash: enforce trashed cap.
  const isMovingToTrash =
    targetFolder.isSystem && targetFolder.ttlDays !== null;
  if (isMovingToTrash && !isComingFromTrash) {
    const trashed = await prisma.cv.count({
      where: {
        userId,
        folder: { isSystem: true, ttlDays: { not: null } },
      },
    });
    if (trashed >= MAX_TRASHED_CVS) {
      throw new CvError(
        "LIMIT_EXCEEDED",
        "Trash full. Empty Corbeille before deleting more CVs.",
      );
    }
  }

  return prisma.cv.update({
    where: { id: cvId },
    data: { folderId: targetFolderId },
  });
}

export async function hardDeleteCv(
  userId: string,
  cvId: string,
): Promise<void> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const trash = await prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
  if (!trash || cv.folderId !== trash.id) {
    throw new CvError(
      "HARD_DELETE_REQUIRES_TRASH",
      "Hard delete requires the CV to be in Corbeille.",
    );
  }

  await prisma.cv.delete({ where: { id: cvId } });
}

export type AnonRecord = {
  id: string;
  title: string;
  templateId: string;
  data: unknown;
  createdAt?: string;
  updatedAt: string;
};

export type ImportSkipped = {
  oldId: string;
  reason: "LIMIT" | "VALIDATION";
};

export type ImportResult = {
  imported: Array<{
    oldId: string;
    newId: string;
    title: string;
    templateId: string;
    updatedAt: Date;
    folderId: string;
  }>;
  skipped: ImportSkipped[];
};

export async function bulkImportCvs(
  userId: string,
  records: AnonRecord[],
): Promise<ImportResult> {
  const default_ = await getDefaultFolder(userId);
  if (!default_) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Default folder missing for user — seeding never ran.",
    );
  }

  const active = await prisma.cv.count({
    where: {
      userId,
      OR: [
        { folder: { isSystem: false } },
        { folder: { isSystem: true, ttlDays: null } },
      ],
    },
  });
  const remaining = Math.max(0, MAX_ACTIVE_CVS - active);

  // Sort newest-first; pre-validate everything; then take first `remaining` valid.
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const validated: Array<{
    record: AnonRecord;
    parsed: unknown;
  }> = [];
  const skipped: ImportSkipped[] = [];

  for (const record of sorted) {
    const parsed = cvDataSchema.safeParse(record.data);
    if (!parsed.success) {
      skipped.push({ oldId: record.id, reason: "VALIDATION" });
      continue;
    }
    validated.push({ record, parsed: parsed.data });
  }

  const toImport = validated.slice(0, remaining);
  const overQuota = validated.slice(remaining);
  for (const { record } of overQuota) {
    skipped.push({ oldId: record.id, reason: "LIMIT" });
  }

  if (toImport.length === 0) {
    return { imported: [], skipped };
  }

  // Create one-by-one to preserve oldId → newId mapping deterministically.
  const created: ImportResult["imported"] = [];
  for (const { record, parsed } of toImport) {
    const row = await prisma.cv.create({
      data: {
        userId,
        folderId: default_.id,
        title: record.title,
        templateId: record.templateId,
        data: parsed as unknown as object,
      },
    });
    created.push({
      oldId: record.id,
      newId: row.id,
      title: row.title,
      templateId: row.templateId,
      updatedAt: row.updatedAt,
      folderId: row.folderId,
    });
  }

  return { imported: created, skipped };
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/cvService.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cvService.ts server/src/services/__tests__/cvService.test.ts
git commit -m "feat(server): cvService move + hard-delete + bulk import"
```

---

## Task 7: Wire system folder seeding into `userService`

**Files:**
- Modify: `server/src/services/userService.ts`
- Modify: `server/src/services/__tests__/userService.test.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: Add a failing test**

Append to `server/src/services/__tests__/userService.test.ts` inside the existing `describe("upsertUserByAuth0Sub", …)`:

```ts
  it("seeds 'Mes CV' and 'Corbeille' on user creation", async () => {
    const seedMock = mock(async (_userId: string) => undefined);
    mock.module("../folderService", () => ({
      seedSystemFolders: seedMock,
    }));

    upsertMock.mockResolvedValueOnce({
      id: "u_new",
      auth0Sub: "auth0|new",
      email: "new@example.com",
      username: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      // No folders relation needed in this mock; the service should call
      // seedSystemFolders only when the upsert is a CREATE (i.e. no rows
      // existed for that auth0Sub before the call).
    } as never);
    findUniqueMock.mockResolvedValueOnce(null);

    const { upsertUserByAuth0Sub } = await import("../userService");
    await upsertUserByAuth0Sub({
      sub: "auth0|new",
      email: "new@example.com",
    });

    expect(seedMock).toHaveBeenCalledTimes(1);
    expect(seedMock).toHaveBeenCalledWith("u_new");
  });

  it("does not re-seed system folders for existing user", async () => {
    const seedMock = mock(async (_userId: string) => undefined);
    mock.module("../folderService", () => ({
      seedSystemFolders: seedMock,
    }));

    upsertMock.mockResolvedValueOnce({
      id: "u_existing",
      auth0Sub: "auth0|existing",
      email: "still@example.com",
      username: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as never);
    findUniqueMock.mockResolvedValueOnce({
      id: "u_existing",
      auth0Sub: "auth0|existing",
    });

    const { upsertUserByAuth0Sub } = await import("../userService");
    await upsertUserByAuth0Sub({
      sub: "auth0|existing",
      email: "still@example.com",
    });

    expect(seedMock).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run, expect failure**

```bash
bun test --preload ./test-setup.ts src/services/__tests__/userService.test.ts
```

Expected: assertion failure on `seedMock` call count.

- [ ] **Step 3: Update `server/src/services/userService.ts`**

```ts
import { prisma } from "../lib/prisma";
import { Prisma } from "../../../prisma/generated/prisma/client";
import type { User } from "../../../prisma/generated/prisma/client";
import { seedSystemFolders } from "./folderService";

export type AppUser = User;

export type Auth0Claims = {
  sub: string;
  email: string;
  email_verified?: boolean;
};

function isAuth0SubConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.includes("auth0_sub");
  if (typeof target === "string")
    return target === "auth0_sub" || target.includes("auth0_sub");
  return false;
}

export async function upsertUserByAuth0Sub(claims: Auth0Claims): Promise<AppUser> {
  if (!claims.sub) {
    throw new Error("Auth0 claims missing required `sub`.");
  }

  // Detect "is new user" by checking before upsert. Avoids extra round-trip
  // on existing users by using findUnique with a narrow select.
  const existing = await prisma.user.findUnique({
    where: { auth0Sub: claims.sub },
    select: { id: true },
  });

  const args = {
    where: { auth0Sub: claims.sub },
    create: { auth0Sub: claims.sub, email: claims.email },
    update: { email: claims.email },
  };

  let user: AppUser;
  try {
    user = (await prisma.user.upsert(args)) as AppUser;
  } catch (err) {
    if (isAuth0SubConflict(err)) {
      user = (await prisma.user.upsert(args)) as AppUser;
    } else {
      throw err;
    }
  }

  if (!existing) {
    // First time we've seen this auth0Sub — seed the system folders.
    // Idempotent guard: caller may retry the whole upsert on transient
    // failures; if seeding partially succeeded last time the unique
    // (userId, name) constraint will surface here. Swallow that case.
    try {
      await seedSystemFolders(user.id);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Already seeded — fine.
      } else {
        throw err;
      }
    }
  }

  return user;
}
```

- [ ] **Step 4: Update `server/src/services/index.ts`** to re-export new services:

```ts
export * from "./userService";
export * from "./folderService";
export * from "./cvService";
export * from "./pdfService";
export * from "./cvImportService";
export * from "./cvTranslateService";
```

(Keep whatever existing exports were there; just add the two new ones.)

- [ ] **Step 5: Run all server tests**

```bash
cd server
bun test --preload ./test-setup.ts src/services/__tests__
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/userService.ts server/src/services/index.ts server/src/services/__tests__/userService.test.ts
git commit -m "feat(server): seed system folders on first user creation"
```

---

## Task 8: Folder routes (HTTP layer)

**Files:**
- Create: `server/src/routes/folders.ts`
- Create: `server/src/routes/__tests__/folders.test.ts`
- Modify: `server/src/routes/index.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write the failing integration test**

`server/src/routes/__tests__/folders.test.ts`:

```ts
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const userClaims = {
  sub: "auth0|u1",
  email: "u1@example.com",
};
const meUserId = "u_1";

const listFoldersMock = mock(async (_userId: string) => [
  { id: "f1", userId: meUserId, name: "Mes CV", isSystem: true, ttlDays: null },
  { id: "f2", userId: meUserId, name: "Corbeille", isSystem: true, ttlDays: 30 },
]);
const createFolderMock = mock(async (_userId: string, name: string) => ({
  id: "f3",
  userId: meUserId,
  name,
  isSystem: false,
  ttlDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const renameFolderMock = mock(async (_u: string, id: string, name: string) => ({
  id,
  userId: meUserId,
  name,
  isSystem: false,
  ttlDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const deleteFolderMock = mock(async (_u: string, _id: string, _to: string) => undefined);

mock.module("../../services/folderService", () => ({
  listFolders: listFoldersMock,
  createFolder: createFolderMock,
  renameFolder: renameFolderMock,
  deleteFolder: deleteFolderMock,
  FolderError: class FolderError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

mock.module("../../middleware/requireAuth", () => ({
  requireAuth:
    () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("userClaims", userClaims);
      c.set("userId", meUserId);
      await next();
    },
}));

import { folderRoutes } from "../folders";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/folders", folderRoutes);
  return app;
}

describe("folder routes", () => {
  beforeEach(() => {
    listFoldersMock.mockClear();
    createFolderMock.mockClear();
    renameFolderMock.mockClear();
    deleteFolderMock.mockClear();
  });

  it("GET /api/v1/folders returns user's folders", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { folders: unknown[] };
    expect(body.folders).toHaveLength(2);
    expect(listFoldersMock).toHaveBeenCalledWith(meUserId);
  });

  it("POST /api/v1/folders creates a custom folder", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alternance" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { folder: { name: string } };
    expect(body.folder.name).toBe("Alternance");
  });

  it("POST /api/v1/folders returns 409 on FolderError(FOLDER_NAME_CONFLICT)", async () => {
    createFolderMock.mockImplementationOnce(async () => {
      const { FolderError } = await import("../../services/folderService");
      throw new FolderError("FOLDER_NAME_CONFLICT", "duplicate");
    });
    const app = buildApp();
    const res = await app.request("/api/v1/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Mes CV" }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("FOLDER_NAME_CONFLICT");
  });

  it("PATCH /api/v1/folders/:id renames", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders/f3", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { folder: { name: string } };
    expect(body.folder.name).toBe("Renamed");
  });

  it("DELETE /api/v1/folders/:id requires moveCvsTo body", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders/f3", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moveCvsTo: "f1" }),
    });
    expect(res.status).toBe(204);
    expect(deleteFolderMock).toHaveBeenCalledWith(meUserId, "f3", "f1");
  });
});
```

Note: this test depends on the routes layer setting `userId` from `userClaims.sub`. If the convention in your codebase is to look up the row by `auth0Sub` in middleware, adapt accordingly. For this plan we assume `requireAuth` middleware also resolves `userId` (a small extension of `requireAuth` to do the user lookup once per request).

- [ ] **Step 2: Run, expect failure**

```bash
cd server
bun test --preload ./test-setup.ts src/routes/__tests__/folders.test.ts
```

Expected: import error for `../folders`.

- [ ] **Step 3: Implement `requireAuth` extension to resolve `userId`**

Modify `server/src/middleware/requireAuth.ts` to look up the local user row and attach `userId` to context. (Skip this step if your middleware already does this; verify by reading the file first.)

```ts
import type { MiddlewareHandler } from "hono";
import { prisma } from "../lib/prisma";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const claims = c.get("userClaims");
    if (!claims) {
      return c.json(
        { error: "Authentification requise.", code: "UNAUTHENTICATED" },
        401,
      );
    }
    const user = await prisma.user.findUnique({
      where: { auth0Sub: claims.sub },
      select: { id: true },
    });
    if (!user) {
      return c.json(
        { error: "Utilisateur introuvable.", code: "NOT_FOUND" },
        404,
      );
    }
    c.set("userId", user.id);
    await next();
  };
}
```

This adds one DB read per authed request; the user-upsert cache from ticket 1 (`optionalAuth.ts`) keeps the upstream upsert from re-firing, so this lookup is the only DB hit now. Acceptable for ticket scope.

- [ ] **Step 4: Implement `server/src/routes/folders.ts`**

```ts
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  FolderError,
} from "../services/folderService";

export const folderRoutes = new Hono();

const nameSchema = z.object({ name: z.string().min(1).max(64) });
const deleteBodySchema = z.object({ moveCvsTo: z.string().min(1) });

function folderErrorToResponse(err: FolderError) {
  switch (err.code) {
    case "VALIDATION":
      return { status: 400 as const, code: "VALIDATION" };
    case "FOLDER_NAME_CONFLICT":
      return { status: 409 as const, code: "FOLDER_NAME_CONFLICT" };
    case "FOLDER_LIMIT_EXCEEDED":
      return { status: 409 as const, code: "FOLDER_LIMIT_EXCEEDED" };
    case "FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "FOLDER_NOT_FOUND" };
    case "FOLDER_IS_SYSTEM":
      return { status: 403 as const, code: "FOLDER_IS_SYSTEM" };
    case "TARGET_FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "TARGET_FOLDER_NOT_FOUND" };
    default:
      return { status: 500 as const, code: "INTERNAL" };
  }
}

folderRoutes.use("*", requireAuth());

folderRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const folders = await listFolders(userId);
  c.header("Cache-Control", "no-store");
  return c.json({ folders });
});

folderRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = nameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nom invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const folder = await createFolder(userId, parsed.data.name);
    c.header("Cache-Control", "no-store");
    return c.json({ folder }, 201);
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

folderRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = nameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nom invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const folder = await renameFolder(userId, id, parsed.data.name);
    c.header("Cache-Control", "no-store");
    return c.json({ folder });
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

folderRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Champ moveCvsTo requis.", code: "VALIDATION" },
      400,
    );
  }
  try {
    await deleteFolder(userId, id, parsed.data.moveCvsTo);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});
```

- [ ] **Step 5: Re-export from `server/src/routes/index.ts`**

```ts
export { authRoutes } from "./auth";
export { cvRoutes } from "./cv";
export { avatarRoutes } from "./avatar";
export { cvImportRoutes } from "./cvImport";
export { cvTranslateRoutes } from "./cvTranslate";
export { folderRoutes } from "./folders";
```

(Preserve any other existing exports.)

- [ ] **Step 6: Mount in `server/src/index.ts`**

Insert after the existing `cv` route mount:

```ts
import { folderRoutes } from "./routes/folders";

// …existing code…

app.route("/api/v1/folders", folderRoutes);
```

- [ ] **Step 7: Run tests**

```bash
bun test --preload ./test-setup.ts src/routes/__tests__/folders.test.ts
bun run type-check
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/folders.ts server/src/routes/__tests__/folders.test.ts \
        server/src/middleware/requireAuth.ts server/src/routes/index.ts server/src/index.ts
git commit -m "feat(server): folders REST routes (CRUD + reassignment)"
```

---

## Task 9: CV routes (HTTP layer)

**Files:**
- Modify: `server/src/routes/cv.ts`
- Modify: `server/src/routes/__tests__/cv.test.ts` (rename current tests if any; otherwise create)

- [ ] **Step 1: Write integration test**

Create `server/src/routes/__tests__/cv.test.ts`:

```ts
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const userClaims = { sub: "auth0|u1", email: "u1@example.com" };
const meUserId = "u_1";

const SAMPLE_DATA = {
  personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

const listActiveMock = mock(async () => [
  { id: "cv_1", userId: meUserId, folderId: "f_default", title: "Mon CV", templateId: "classique", data: SAMPLE_DATA, createdAt: new Date(), updatedAt: new Date() },
]);
const listTrashMock = mock(async () => []);
const readMock = mock(async () => null as unknown);
const createMock = mock(async () => ({
  id: "cv_new",
  userId: meUserId,
  folderId: "f_default",
  title: "X",
  templateId: "classique",
  data: SAMPLE_DATA,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const patchMock = mock(async () => ({
  id: "cv_1",
  userId: meUserId,
  folderId: "f_default",
  title: "Renamed",
  templateId: "classique",
  data: SAMPLE_DATA,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const moveMock = mock(async () => ({} as unknown));
const hardDeleteMock = mock(async () => undefined);
const bulkImportMock = mock(async () => ({ imported: [], skipped: [] }));

mock.module("../../services/cvService", () => ({
  listActiveCvs: listActiveMock,
  listTrashCvs: listTrashMock,
  readCv: readMock,
  createCv: createMock,
  patchCv: patchMock,
  moveCv: moveMock,
  hardDeleteCv: hardDeleteMock,
  bulkImportCvs: bulkImportMock,
  CvError: class CvError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

mock.module("../../middleware/requireAuth", () => ({
  requireAuth:
    () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("userClaims", userClaims);
      c.set("userId", meUserId);
      await next();
    },
}));

import { cvRoutes } from "../cv";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/cv", cvRoutes);
  return app;
}

describe("cv routes", () => {
  beforeEach(() => {
    listActiveMock.mockClear();
    listTrashMock.mockClear();
    readMock.mockClear();
    createMock.mockClear();
    patchMock.mockClear();
    moveMock.mockClear();
    hardDeleteMock.mockClear();
    bulkImportMock.mockClear();
  });

  it("GET /api/v1/cv returns active CVs", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cvs: unknown[] };
    expect(body.cvs).toHaveLength(1);
  });

  it("GET /api/v1/cv/trash returns trashed", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/trash");
    expect(res.status).toBe(200);
    expect(listTrashMock).toHaveBeenCalled();
  });

  it("POST /api/v1/cv creates", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "X", templateId: "classique", data: SAMPLE_DATA }),
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/v1/cv/import calls bulkImportCvs", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { id: "old1", title: "X", templateId: "classique", data: SAMPLE_DATA, updatedAt: new Date().toISOString() },
      ]),
    });
    expect(res.status).toBe(200);
    expect(bulkImportMock).toHaveBeenCalled();
  });

  it("PATCH /api/v1/cv/:id updates", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/v1/cv/:id/move calls moveCv", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId: "f_target" }),
    });
    expect(res.status).toBe(200);
    expect(moveMock).toHaveBeenCalledWith(meUserId, "cv_1", "f_target");
  });

  it("DELETE /api/v1/cv/:id calls hardDeleteCv", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(hardDeleteMock).toHaveBeenCalledWith(meUserId, "cv_1");
  });

  it("returns 409 LIMIT_EXCEEDED from CvError", async () => {
    createMock.mockImplementationOnce(async () => {
      const { CvError } = await import("../../services/cvService");
      throw new CvError("LIMIT_EXCEEDED", "limit reached");
    });
    const app = buildApp();
    const res = await app.request("/api/v1/cv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "X", templateId: "classique", data: SAMPLE_DATA }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("LIMIT_EXCEEDED");
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun test --preload ./test-setup.ts src/routes/__tests__/cv.test.ts
```

Expected: route handlers don't exist yet.

- [ ] **Step 3: Extend `server/src/routes/cv.ts`**

Append to the existing file (the PDF route stays at the top, anonymous):

```ts
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import {
  listActiveCvs,
  listTrashCvs,
  readCv,
  createCv,
  patchCv,
  moveCv,
  hardDeleteCv,
  bulkImportCvs,
  CvError,
} from "../services/cvService";

const templateIdEnum = z.enum(["classique", "moderne", "minimaliste"]);

const createBodySchema = z.object({
  title: z.string().min(1).max(200),
  templateId: templateIdEnum,
  data: z.unknown(),
  folderId: z.string().min(1).optional(),
});

const patchBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: templateIdEnum.optional(),
  data: z.unknown().optional(),
});

const moveBodySchema = z.object({ folderId: z.string().min(1) });

const importBodySchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    templateId: templateIdEnum,
    data: z.unknown(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime(),
  }),
);

function cvErrorToResponse(err: CvError) {
  switch (err.code) {
    case "VALIDATION":
      return { status: 400 as const, code: "VALIDATION" };
    case "LIMIT_EXCEEDED":
      return { status: 409 as const, code: "LIMIT_EXCEEDED" };
    case "CV_NOT_FOUND":
      return { status: 404 as const, code: "NOT_FOUND" };
    case "TARGET_FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "TARGET_FOLDER_NOT_FOUND" };
    case "HARD_DELETE_REQUIRES_TRASH":
      return { status: 403 as const, code: "HARD_DELETE_REQUIRES_TRASH" };
    default:
      return { status: 500 as const, code: "INTERNAL" };
  }
}

// Authed CV management — separate sub-router so the existing PDF route
// stays anonymous.
const authedCv = new Hono();
authedCv.use("*", requireAuth());

authedCv.get("/", async (c) => {
  const userId = c.get("userId");
  const cvs = await listActiveCvs(userId);
  c.header("Cache-Control", "no-store");
  return c.json({
    cvs: cvs.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      title: r.title,
      templateId: r.templateId,
      updatedAt: r.updatedAt,
    })),
  });
});

authedCv.get("/trash", async (c) => {
  const userId = c.get("userId");
  const cvs = await listTrashCvs(userId);
  c.header("Cache-Control", "no-store");
  return c.json({
    cvs: cvs.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      title: r.title,
      templateId: r.templateId,
      updatedAt: r.updatedAt,
    })),
  });
});

authedCv.get("/:id", async (c) => {
  const userId = c.get("userId");
  const cv = await readCv(userId, c.req.param("id"));
  if (!cv) {
    return c.json({ error: "CV introuvable.", code: "NOT_FOUND" }, 404);
  }
  c.header("Cache-Control", "no-store");
  return c.json({ cv });
});

authedCv.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const cv = await createCv(userId, parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json({ cv }, 201);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const cv = await patchCv(userId, c.req.param("id"), parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json({ cv });
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.post("/:id/move", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = moveBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    await moveCv(userId, c.req.param("id"), parsed.data.folderId);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.delete("/:id", async (c) => {
  const userId = c.get("userId");
  try {
    await hardDeleteCv(userId, c.req.param("id"));
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.post("/import", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = importBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const result = await bulkImportCvs(userId, parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json(result);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

cvRoutes.route("/", authedCv);
```

The order matters: declare `authedCv` AFTER the existing `cvRoutes.post("/pdf", …)` so the authed sub-router doesn't intercept the anonymous PDF route. The `requireAuth` middleware on `authedCv` is scoped, so it stays out of the PDF path.

- [ ] **Step 4: Run all server tests**

```bash
bun test --preload ./test-setup.ts src/routes/__tests__
```

Expected: all pass (existing PDF tests still pass, new tests pass).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/cv.ts server/src/routes/__tests__/cv.test.ts
git commit -m "feat(server): CV management routes alongside anon PDF route"
```

---

## Task 10: Client `CvStore` types

**Files:**
- Create: `client/src/features/cv-library/store/types.ts`

- [ ] **Step 1: Write `types.ts`** (no test — pure type definitions)

```ts
import type { CvData, TemplateId } from "@cvie/shared";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

export type CvLibraryRecord = {
  id: string;
  title: string;
  templateId: TemplateId;
  folderId: string | null; // null only for anon (LocalCvStore has no folder model)
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  isSystem: boolean;
  ttlDays: number | null;
};

export type AnonExport = {
  id: string;
  title: string;
  templateId: TemplateId;
  data: CvData;
  createdAt?: string;
  updatedAt: string;
};

export type ImportResult = {
  imported: Array<{ oldId: string; newId: string; title: string; templateId: TemplateId; updatedAt: string; folderId: string }>;
  skipped: Array<{ oldId: string; reason: "LIMIT" | "VALIDATION" }>;
};

export interface CvStore {
  // Folders (DB-only; LocalCvStore returns [] / throws NotSupported on mutators)
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  deleteFolder(id: string, moveCvsTo: string): Promise<void>;

  // CVs
  listActive(): Promise<CvLibraryRecord[]>;
  listTrash(): Promise<CvLibraryRecord[]>;
  read(id: string): Promise<CvData | null>;
  create(record: { title: string; templateId: TemplateId; folderId?: string }, body: CvData): Promise<CvLibraryRecord>;
  patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord>;
  moveCv(id: string, folderId: string): Promise<void>;
  hardDeleteCv(id: string): Promise<void>;
  bulkImport(records: AnonExport[]): Promise<ImportResult>;

  // Status stream for UI badge
  subscribeStatus(cb: (s: SyncStatus) => void): () => void;
}

export class CvStoreError extends Error {
  constructor(
    public readonly code:
      | "NOT_SUPPORTED"
      | "OFFLINE"
      | "VALIDATION"
      | "LIMIT_EXCEEDED"
      | "FOLDER_NAME_CONFLICT"
      | "FOLDER_LIMIT_EXCEEDED"
      | "FOLDER_IS_SYSTEM"
      | "NOT_FOUND"
      | "UNAUTHENTICATED"
      | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "CvStoreError";
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/fadi/test_bmad/cvie-fr
bun run --filter=@cvie/client type-check
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add client/src/features/cv-library/store/types.ts
git commit -m "feat(client): CvStore interface and types"
```

---

## Task 11: `LocalCvStore` (refactor existing storage into a store impl)

**Files:**
- Create: `client/src/features/cv-library/store/LocalCvStore.ts`
- Create: `client/src/features/cv-library/store/__tests__/LocalCvStore.test.ts`

- [ ] **Step 1: Write the failing test**

`client/src/features/cv-library/store/__tests__/LocalCvStore.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalCvStore } from "../LocalCvStore";
import type { CvData } from "@cvie/shared";

const SAMPLE: CvData = {
  personalInfo: { firstName: "A", lastName: "B", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

describe("LocalCvStore (anon namespace)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("listActive returns the seeded library when none exists", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    const list = await store.listActive();
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("cv-main");
  });

  it("create writes both library entry and draft", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    const rec = await store.create(
      { title: "Test", templateId: "classique" },
      SAMPLE,
    );
    expect(rec.id.startsWith("cv-")).toBe(true);
    const body = await store.read(rec.id);
    expect(body?.personalInfo.firstName).toBe("A");
  });

  it("patch updates body draft and emits status saved", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    const created = await store.create(
      { title: "T", templateId: "classique" },
      SAMPLE,
    );
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    await store.patch(created.id, {
      data: {
        ...SAMPLE,
        personalInfo: { ...SAMPLE.personalInfo, firstName: "Z" },
      },
    });
    off();
    expect(events).toContain("saved");
  });

  it("hardDeleteCv removes the record from library and draft storage", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    const created = await store.create(
      { title: "T", templateId: "classique" },
      SAMPLE,
    );
    await store.hardDeleteCv(created.id);
    const list = await store.listActive();
    expect(list.find((r) => r.id === created.id)).toBeUndefined();
    const body = await store.read(created.id);
    expect(body).toBeNull();
  });

  it("listFolders returns empty (folders unsupported in anon)", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    expect(await store.listFolders()).toEqual([]);
  });

  it("createFolder throws NOT_SUPPORTED", async () => {
    const store = new LocalCvStore({ namespace: "anon" });
    await expect(store.createFolder("X")).rejects.toMatchObject({
      code: "NOT_SUPPORTED",
    });
  });

  it("namespace separation: 'user-abc' and 'anon' don't collide", async () => {
    const anon = new LocalCvStore({ namespace: "anon" });
    const user = new LocalCvStore({ namespace: "user-abc" });
    await anon.create({ title: "Anon", templateId: "classique" }, SAMPLE);
    const userList = await user.listActive();
    // user namespace is fresh: the seeded "Mon CV" is its own
    expect(userList.find((r) => r.title === "Anon")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
cd client
bun run test -- LocalCvStore
```

Expected: import resolution error.

- [ ] **Step 3: Implement `LocalCvStore.ts`**

`client/src/features/cv-library/store/LocalCvStore.ts`:

```ts
import { cvDataSchema, type CvData, type TemplateId } from "@cvie/shared";
import type {
  AnonExport,
  CvLibraryRecord,
  CvStore,
  Folder,
  ImportResult,
  SyncStatus,
} from "./types";
import { CvStoreError } from "./types";

const ANON_LIBRARY_KEY = "cvie.cv.library.v1";
const ANON_DRAFT_PREFIX = "cvie.cv.draft.";

function libraryKey(namespace: string): string {
  return namespace === "anon"
    ? ANON_LIBRARY_KEY
    : `cvie.user.${namespace}.cv.library.v1`;
}
function draftKey(namespace: string, cvId: string): string {
  return namespace === "anon"
    ? `${ANON_DRAFT_PREFIX}${cvId}`
    : `cvie.user.${namespace}.cv.draft.${cvId}`;
}

const SEEDED_DEMO_IDS = new Set([
  "cv-product-lead",
  "cv-data-storytelling",
  "cv-ux-strategy",
]);

const DEFAULT_LIBRARY = (): CvLibraryRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: "cv-main",
      title: "Mon CV",
      templateId: "classique",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is CvLibraryRecord {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.templateId === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

type Listener = (s: SyncStatus) => void;

export type LocalCvStoreOptions = {
  /**
   * "anon" uses the legacy keys (`cvie.cv.library.v1` etc.) so existing
   * users' data is preserved across the refactor. Any other value (e.g.
   * `user-<auth0Sub>`) namespaces the keys under that identity.
   */
  namespace: string;
};

export class LocalCvStore implements CvStore {
  private readonly listeners = new Set<Listener>();
  constructor(private readonly opts: LocalCvStoreOptions) {}

  private emit(status: SyncStatus): void {
    for (const cb of this.listeners) cb(status);
  }

  subscribeStatus(cb: Listener): () => void {
    this.listeners.add(cb);
    cb("idle");
    return () => {
      this.listeners.delete(cb);
    };
  }

  // — Folders are unsupported in local-only mode —

  async listFolders(): Promise<Folder[]> {
    return [];
  }
  async createFolder(_: string): Promise<Folder> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }
  async renameFolder(_: string, __: string): Promise<Folder> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }
  async deleteFolder(_: string, __: string): Promise<void> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }

  // — CVs —

  private readLibrary(): CvLibraryRecord[] {
    const storage = safeStorage();
    if (!storage) return DEFAULT_LIBRARY();
    try {
      const raw = storage.getItem(libraryKey(this.opts.namespace));
      if (!raw) {
        const def = DEFAULT_LIBRARY();
        this.writeLibrary(def);
        return def;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_LIBRARY();
      const valid = parsed.filter(isRecord);
      if (valid.length === 0) return DEFAULT_LIBRARY();
      const onlySeededDemo =
        valid.length === SEEDED_DEMO_IDS.size &&
        valid.every((r) => SEEDED_DEMO_IDS.has(r.id));
      if (onlySeededDemo) {
        const migrated = DEFAULT_LIBRARY();
        this.writeLibrary(migrated);
        return migrated;
      }
      return [...valid].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch {
      return DEFAULT_LIBRARY();
    }
  }

  private writeLibrary(records: CvLibraryRecord[]): void {
    const storage = safeStorage();
    if (!storage) return;
    try {
      storage.setItem(
        libraryKey(this.opts.namespace),
        JSON.stringify(records),
      );
    } catch {
      // ignore quota errors
    }
  }

  async listActive(): Promise<CvLibraryRecord[]> {
    return this.readLibrary();
  }

  async listTrash(): Promise<CvLibraryRecord[]> {
    return [];
  }

  async read(id: string): Promise<CvData | null> {
    const storage = safeStorage();
    if (!storage) return null;
    const raw = storage.getItem(draftKey(this.opts.namespace, id));
    if (!raw) return null;
    try {
      const parsed = cvDataSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async create(
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ): Promise<CvLibraryRecord> {
    const id = `cv-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: CvLibraryRecord = {
      id,
      title: record.title.trim() || "Nouveau CV",
      templateId: record.templateId,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    };
    const lib = [newRec, ...this.readLibrary()];
    this.writeLibrary(lib);
    await this.patch(id, { data: body });
    return newRec;
  }

  async patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord> {
    this.emit("saving");
    const storage = safeStorage();
    const lib = this.readLibrary();
    const idx = lib.findIndex((r) => r.id === id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      const cur = lib[idx]!;
      const next: CvLibraryRecord = {
        ...cur,
        title: partial.title?.trim() || cur.title,
        templateId: partial.templateId ?? cur.templateId,
        updatedAt: now,
      };
      lib[idx] = next;
      this.writeLibrary(lib);
    }
    if (partial.data !== undefined && storage) {
      const parsed = cvDataSchema.safeParse(partial.data);
      if (!parsed.success) {
        this.emit("error");
        throw new CvStoreError("VALIDATION", "CV body failed schema check.");
      }
      try {
        storage.setItem(
          draftKey(this.opts.namespace, id),
          JSON.stringify(parsed.data),
        );
      } catch {
        this.emit("error");
        throw new CvStoreError("INTERNAL", "Failed to write to localStorage.");
      }
    }
    const after = this.readLibrary().find((r) => r.id === id) ?? {
      id,
      title: partial.title ?? "",
      templateId: partial.templateId ?? "classique",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.emit("saved");
    return after;
  }

  async moveCv(_id: string, _folderId: string): Promise<void> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folder moves require a signed-in account.",
    );
  }

  async hardDeleteCv(id: string): Promise<void> {
    const storage = safeStorage();
    if (!storage) return;
    const lib = this.readLibrary().filter((r) => r.id !== id);
    this.writeLibrary(lib);
    storage.removeItem(draftKey(this.opts.namespace, id));
  }

  async bulkImport(_: AnonExport[]): Promise<ImportResult> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Bulk import requires a signed-in account.",
    );
  }
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun run --filter=@cvie/client test -- LocalCvStore
```

Expected: 7 pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/features/cv-library/store/LocalCvStore.ts \
        client/src/features/cv-library/store/__tests__/LocalCvStore.test.ts
git commit -m "feat(client): LocalCvStore implementing CvStore over localStorage"
```

---

## Task 12: `DbCvStore` — server-backed adapter with queue + retry

**Files:**
- Create: `client/src/features/cv-library/store/DbCvStore.ts`
- Create: `client/src/features/cv-library/store/__tests__/DbCvStore.test.ts`

- [ ] **Step 1: Write failing tests**

`client/src/features/cv-library/store/__tests__/DbCvStore.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DbCvStore } from "../DbCvStore";
import { LocalCvStore } from "../LocalCvStore";
import type { CvData } from "@cvie/shared";

const SAMPLE: CvData = {
  personalInfo: { firstName: "A", lastName: "B", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("DbCvStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let local: LocalCvStore;
  let store: DbCvStore;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    local = new LocalCvStore({ namespace: "user-test" });
    store = new DbCvStore({ namespace: "user-test", local, retry: { initialMs: 1, maxMs: 4 } });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("listActive fetches and replaces local cache", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cvs: [
          {
            id: "cv_1",
            title: "Server",
            templateId: "classique",
            folderId: "f_d",
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const list = await store.listActive();
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("cv_1");
  });

  it("patch dual-writes: localStorage immediately, server PATCHes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          userId: "u",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    await store.patch("cv_1", { data: SAMPLE });
    // local cache has the body
    const body = await local.read("cv_1");
    expect(body?.personalInfo.firstName).toBe("A");
    expect(fetchMock).toHaveBeenCalled();
    const url = fetchMock.mock.calls[0]?.[0];
    expect(String(url)).toContain("/api/v1/cv/cv_1");
  });

  it("emits 'offline' when fetch fails and retries on online event", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    await store.patch("cv_1", { data: SAMPLE });
    // First attempt fails — status flips to offline
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toContain("offline");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 30));
    expect(events).toContain("saved");
    off();
  });

  it("emits 'error' on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "x", code: "UNAUTHENTICATED" }, { status: 401 }),
    );
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    await store.patch("cv_1", { data: SAMPLE });
    await new Promise((r) => setTimeout(r, 10));
    off();
    expect(events).toContain("error");
  });

  it("collapses successive patches into a single in-flight request", async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((res) => {
          resolveFirst = res;
        }),
    );
    const p1 = store.patch("cv_1", {
      data: { ...SAMPLE, personalInfo: { ...SAMPLE.personalInfo, firstName: "1" } },
    });
    const p2 = store.patch("cv_1", {
      data: { ...SAMPLE, personalInfo: { ...SAMPLE.personalInfo, firstName: "2" } },
    });
    // Second call should NOT issue a new fetch yet — it's coalesced.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    resolveFirst(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    await Promise.all([p1, p2]);
    // After first resolves, the queued second flushes — total 2 fetches.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun run --filter=@cvie/client test -- DbCvStore
```

Expected: cannot resolve `../DbCvStore`.

- [ ] **Step 3: Implement `DbCvStore.ts`**

`client/src/features/cv-library/store/DbCvStore.ts`:

```ts
import type { CvData, TemplateId } from "@cvie/shared";
import type {
  AnonExport,
  CvLibraryRecord,
  CvStore,
  Folder,
  ImportResult,
  SyncStatus,
} from "./types";
import { CvStoreError } from "./types";
import type { LocalCvStore } from "./LocalCvStore";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type DbCvStoreOptions = {
  /** Identity scope for the localStorage cache. Typically `user-<auth0Sub>`. */
  namespace: string;
  /** Underlying LocalCvStore wrapping the same namespace. */
  local: LocalCvStore;
  /** Auth-injecting fetch (e.g. from `useAuthApi`). Defaults to global `fetch`. */
  fetch?: AuthFetch;
  /** Retry timing — exposed for tests. */
  retry?: { initialMs?: number; maxMs?: number };
};

type Pending = {
  partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>;
  resolve: (rec: CvLibraryRecord) => void;
  reject: (err: unknown) => void;
  inflight: boolean;
  attempts: number;
};

const DEFAULT_INITIAL_BACKOFF = 1_000;
const DEFAULT_MAX_BACKOFF = 30_000;

export class DbCvStore implements CvStore {
  private readonly listeners = new Set<(s: SyncStatus) => void>();
  private readonly fetch: AuthFetch;
  private readonly queue = new Map<string, Pending>();
  private status: SyncStatus = "idle";

  constructor(private readonly opts: DbCvStoreOptions) {
    this.fetch = opts.fetch ?? ((input, init) => fetch(input, init));
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.drainQueue();
      });
    }
  }

  private setStatus(s: SyncStatus): void {
    this.status = s;
    for (const cb of this.listeners) cb(s);
  }

  subscribeStatus(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private async request<T>(
    input: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await this.fetch(input, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status === 401) {
      throw new CvStoreError("UNAUTHENTICATED", "Session expirée.");
    }
    if (!res.ok) {
      let code = "INTERNAL";
      try {
        const body = (await res.clone().json()) as { code?: string };
        if (body.code) code = body.code;
      } catch {
        /* ignore */
      }
      throw new CvStoreError(
        code as never,
        `HTTP ${res.status} (${code})`,
      );
    }
    return (await res.json()) as T;
  }

  // — Folders —

  async listFolders(): Promise<Folder[]> {
    const { folders } = await this.request<{ folders: Folder[] }>(
      "/api/v1/folders",
    );
    return folders;
  }

  async createFolder(name: string): Promise<Folder> {
    const { folder } = await this.request<{ folder: Folder }>(
      "/api/v1/folders",
      { method: "POST", body: JSON.stringify({ name }) },
    );
    return folder;
  }

  async renameFolder(id: string, name: string): Promise<Folder> {
    const { folder } = await this.request<{ folder: Folder }>(
      `/api/v1/folders/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    );
    return folder;
  }

  async deleteFolder(id: string, moveCvsTo: string): Promise<void> {
    await this.request<unknown>(
      `/api/v1/folders/${encodeURIComponent(id)}`,
      { method: "DELETE", body: JSON.stringify({ moveCvsTo }) },
    );
  }

  // — CVs —

  async listActive(): Promise<CvLibraryRecord[]> {
    type Resp = {
      cvs: Array<{
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      }>;
    };
    const { cvs } = await this.request<Resp>("/api/v1/cv");
    return cvs.map((c) => ({
      id: c.id,
      title: c.title,
      templateId: c.templateId,
      folderId: c.folderId,
      createdAt: c.updatedAt, // server doesn't return createdAt in list view
      updatedAt: c.updatedAt,
    }));
  }

  async listTrash(): Promise<CvLibraryRecord[]> {
    type Resp = {
      cvs: Array<{
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      }>;
    };
    const { cvs } = await this.request<Resp>("/api/v1/cv/trash");
    return cvs.map((c) => ({
      id: c.id,
      title: c.title,
      templateId: c.templateId,
      folderId: c.folderId,
      createdAt: c.updatedAt,
      updatedAt: c.updatedAt,
    }));
  }

  async read(id: string): Promise<CvData | null> {
    const cached = await this.opts.local.read(id);
    if (cached) return cached;
    try {
      const { cv } = await this.request<{
        cv: { data: CvData };
      }>(`/api/v1/cv/${encodeURIComponent(id)}`);
      // Hydrate local cache for next read
      await this.opts.local.patch(id, { data: cv.data });
      return cv.data;
    } catch (err) {
      if (err instanceof CvStoreError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  }

  async create(
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ): Promise<CvLibraryRecord> {
    const { cv } = await this.request<{
      cv: {
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      };
    }>("/api/v1/cv", {
      method: "POST",
      body: JSON.stringify({
        title: record.title,
        templateId: record.templateId,
        folderId: record.folderId,
        data: body,
      }),
    });
    // Keep local cache in sync
    await this.opts.local.patch(cv.id, { data: body, title: cv.title, templateId: cv.templateId });
    return {
      id: cv.id,
      title: cv.title,
      templateId: cv.templateId,
      folderId: cv.folderId,
      createdAt: cv.updatedAt,
      updatedAt: cv.updatedAt,
    };
  }

  async patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord> {
    // Local first (durable cache)
    await this.opts.local.patch(id, partial);

    // Coalesce in queue
    return new Promise<CvLibraryRecord>((resolve, reject) => {
      const existing = this.queue.get(id);
      if (existing && !existing.inflight) {
        existing.partial = { ...existing.partial, ...partial };
        existing.resolve = resolve;
        existing.reject = reject;
        return;
      }
      const entry: Pending = {
        partial,
        resolve,
        reject,
        inflight: false,
        attempts: 0,
      };
      this.queue.set(id, entry);
      void this.flush(id);
    });
  }

  private async flush(id: string): Promise<void> {
    const entry = this.queue.get(id);
    if (!entry || entry.inflight) return;
    entry.inflight = true;
    this.setStatus("saving");
    try {
      const { cv } = await this.request<{
        cv: {
          id: string;
          folderId: string;
          title: string;
          templateId: TemplateId;
          updatedAt: string;
        };
      }>(`/api/v1/cv/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(entry.partial),
      });
      this.queue.delete(id);
      const rec: CvLibraryRecord = {
        id: cv.id,
        title: cv.title,
        templateId: cv.templateId,
        folderId: cv.folderId,
        createdAt: cv.updatedAt,
        updatedAt: cv.updatedAt,
      };
      entry.resolve(rec);
      this.setStatus("saved");
    } catch (err) {
      entry.inflight = false;
      entry.attempts += 1;
      if (
        err instanceof CvStoreError &&
        (err.code === "UNAUTHENTICATED" ||
          err.code === "VALIDATION" ||
          err.code === "LIMIT_EXCEEDED" ||
          err.code === "NOT_FOUND")
      ) {
        this.queue.delete(id);
        entry.reject(err);
        this.setStatus("error");
        return;
      }
      // Network / 5xx — stay queued, schedule retry
      this.setStatus("offline");
      const initial = this.opts.retry?.initialMs ?? DEFAULT_INITIAL_BACKOFF;
      const max = this.opts.retry?.maxMs ?? DEFAULT_MAX_BACKOFF;
      const delay = Math.min(max, initial * Math.pow(2, entry.attempts - 1));
      setTimeout(() => {
        void this.flush(id);
      }, delay);
    }
  }

  private async drainQueue(): Promise<void> {
    for (const [id, entry] of this.queue.entries()) {
      if (!entry.inflight) {
        await this.flush(id);
      }
    }
  }

  async moveCv(id: string, folderId: string): Promise<void> {
    await this.request<unknown>(
      `/api/v1/cv/${encodeURIComponent(id)}/move`,
      { method: "POST", body: JSON.stringify({ folderId }) },
    );
  }

  async hardDeleteCv(id: string): Promise<void> {
    await this.request<unknown>(
      `/api/v1/cv/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    await this.opts.local.hardDeleteCv(id);
  }

  async bulkImport(records: AnonExport[]): Promise<ImportResult> {
    return this.request<ImportResult>("/api/v1/cv/import", {
      method: "POST",
      body: JSON.stringify(
        records.map((r) => ({
          id: r.id,
          title: r.title,
          templateId: r.templateId,
          data: r.data,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      ),
    });
  }
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun run --filter=@cvie/client test -- DbCvStore
```

Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/features/cv-library/store/DbCvStore.ts \
        client/src/features/cv-library/store/__tests__/DbCvStore.test.ts
git commit -m "feat(client): DbCvStore with dual-write queue + offline retry"
```

---

## Task 13: `useCvStore` hook + factory

**Files:**
- Create: `client/src/features/cv-library/store/index.ts`
- Create: `client/src/features/cv-library/hooks/useCvStore.ts`
- Create: `client/src/features/cv-library/hooks/__tests__/useCvStore.test.tsx`

- [ ] **Step 1: Write failing test**

`client/src/features/cv-library/hooks/__tests__/useCvStore.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const useAuth0Mock = vi.fn();
vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => useAuth0Mock() }));

import { useCvStore } from "../useCvStore";
import { LocalCvStore } from "../../store/LocalCvStore";
import { DbCvStore } from "../../store/DbCvStore";

describe("useCvStore", () => {
  it("returns LocalCvStore when not authenticated", () => {
    useAuth0Mock.mockReturnValue({ isAuthenticated: false, user: undefined });
    const { result } = renderHook(() => useCvStore());
    expect(result.current).toBeInstanceOf(LocalCvStore);
  });

  it("returns DbCvStore when authenticated with sub", () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|123" },
    });
    const { result } = renderHook(() => useCvStore());
    expect(result.current).toBeInstanceOf(DbCvStore);
  });

  it("rebuilds the store when sub changes", () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|a" },
    });
    const { result, rerender } = renderHook(() => useCvStore());
    const first = result.current;
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|b" },
    });
    rerender();
    expect(result.current).not.toBe(first);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun run --filter=@cvie/client test -- useCvStore
```

Expected: cannot resolve `../useCvStore`.

- [ ] **Step 3: Implement factory + hook**

`client/src/features/cv-library/store/index.ts`:

```ts
import { LocalCvStore } from "./LocalCvStore";
import { DbCvStore } from "./DbCvStore";
import type { CvStore } from "./types";

export type StoreKind =
  | { kind: "local" }
  | { kind: "db"; sub: string; fetch?: typeof fetch };

export function createCvStore(opts: StoreKind): CvStore {
  if (opts.kind === "local") {
    return new LocalCvStore({ namespace: "anon" });
  }
  const namespace = `user-${opts.sub}`;
  const local = new LocalCvStore({ namespace });
  return new DbCvStore({ namespace, local, fetch: opts.fetch });
}

export * from "./types";
export { LocalCvStore } from "./LocalCvStore";
export { DbCvStore } from "./DbCvStore";
```

`client/src/features/cv-library/hooks/useCvStore.ts`:

```ts
import { useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";
import { createCvStore } from "../store";
import type { CvStore } from "../store/types";

export function useCvStore(): CvStore {
  const { isAuthenticated, user } = useAuth0();
  const { fetch: authFetch } = useAuthApi();
  return useMemo(() => {
    if (!isAuthenticated || !user?.sub) {
      return createCvStore({ kind: "local" });
    }
    return createCvStore({ kind: "db", sub: user.sub, fetch: authFetch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.sub]);
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run --filter=@cvie/client test -- useCvStore
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/features/cv-library/store/index.ts \
        client/src/features/cv-library/hooks/useCvStore.ts \
        client/src/features/cv-library/hooks/__tests__/useCvStore.test.tsx
git commit -m "feat(client): useCvStore hook + store factory"
```

---

## Task 14: Refactor `useCvDraft` to consume `CvStore`

**Files:**
- Modify: `client/src/features/editor/hooks/useCvDraft.ts`
- Modify: `client/src/features/editor/hooks/useCvDraft.test.ts`

- [ ] **Step 1: Update test expectations**

Modify `client/src/features/editor/hooks/useCvDraft.test.ts` to inject a fake store rather than mocking localStorage. (Read existing test file first; preserve its structure.) Add a smoke test:

```tsx
it("invokes store.patch when the form changes", async () => {
  const patch = vi.fn().mockResolvedValue({});
  const fakeStore = makeFakeStore({ patch });
  // …render hook with the fake store, simulate field change…
  // …expect patch called with { data }…
});
```

(Adapt to the actual existing test setup. Keep current persistence-status assertions, just route them through `store.subscribeStatus`.)

- [ ] **Step 2: Run, expect failure**

```bash
bun run --filter=@cvie/client test -- useCvDraft
```

Expected: failure on the new assertion.

- [ ] **Step 3: Refactor `useCvDraft.ts` to use a store**

Replace the direct localStorage write at the persist site with `store.patch(cvId, { data: parsed.data })`. Subscribe to `store.subscribeStatus` and surface the same `persistStatus` external API. Accept an optional `store` parameter in the hook signature for tests; default to `useCvStore()` when not passed.

The full file is too long to inline here cleanly; the diff is bounded:

1. Import `useCvStore` from `@/features/cv-library/hooks/useCvStore`.
2. Replace the `safeStorage()` block in the `writeNow` function with:
   ```ts
   try {
     setPersistStatus("saving");
     await store.patch(cvId, { data: parsed.data });
     setPersistStatus("saved");
     onPersistedRef.current?.();
   } catch (err) {
     setPersistStatus("failed");
   }
   ```
3. Remove the read-from-localStorage hydration path and replace with `store.read(cvId)`:
   ```ts
   useEffect(() => {
     let alive = true;
     void store.read(cvId).then((draft) => {
       if (!alive) return;
       if (draft) form.reset(draft);
       hasHydratedRef.current = true;
     });
     return () => {
       alive = false;
     };
   }, [store, cvId, form]);
   ```
4. Subscribe to `store.subscribeStatus` and merge into `persistStatus`:
   ```ts
   useEffect(() => {
     return store.subscribeStatus((s) => {
       if (s === "offline") setPersistStatus("offline");
       else if (s === "error") setPersistStatus("failed");
     });
   }, [store]);
   ```

Persist statuses widen from `idle | saving | saved | failed` to `idle | saving | saved | failed | offline`. The new `offline` value is consumed by the badge component (Task 16).

- [ ] **Step 4: Run, expect pass**

```bash
bun run --filter=@cvie/client test -- useCvDraft
```

Expected: pass.

- [ ] **Step 5: Type-check + commit**

```bash
bun run type-check
git add client/src/features/editor/hooks/useCvDraft.ts client/src/features/editor/hooks/useCvDraft.test.ts
git commit -m "refactor(client): useCvDraft consumes CvStore for persistence"
```

---

## Task 15: `useCvLibrary` hook for the sidebar

**Files:**
- Create: `client/src/features/cv-library/hooks/useCvLibrary.ts`

- [ ] **Step 1: Write hook directly (no separate test — covered by sidebar tests in Task 21)**

`client/src/features/cv-library/hooks/useCvLibrary.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { useCvStore } from "./useCvStore";
import type {
  AnonExport,
  CvLibraryRecord,
  Folder,
  ImportResult,
  SyncStatus,
} from "../store/types";
import type { CvData, TemplateId } from "@cvie/shared";

export type UseCvLibrary = {
  active: CvLibraryRecord[];
  trash: CvLibraryRecord[];
  folders: Folder[];
  status: SyncStatus;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createCv: (record: { title: string; templateId: TemplateId; folderId?: string }, body: CvData) => Promise<CvLibraryRecord>;
  moveCv: (id: string, folderId: string) => Promise<void>;
  hardDeleteCv: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<Folder>;
  deleteFolder: (id: string, moveCvsTo: string) => Promise<void>;
  bulkImport: (records: AnonExport[]) => Promise<ImportResult>;
};

export function useCvLibrary(): UseCvLibrary {
  const store = useCvStore();
  const [active, setActive] = useState<CvLibraryRecord[]>([]);
  const [trash, setTrash] = useState<CvLibraryRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t, f] = await Promise.all([
        store.listActive(),
        store.listTrash().catch(() => []),
        store.listFolders().catch(() => []),
      ]);
      setActive(a);
      setTrash(t);
      setFolders(f);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
    return store.subscribeStatus(setStatus);
  }, [store, refresh]);

  return {
    active,
    trash,
    folders,
    status,
    loading,
    error,
    refresh,
    createCv: async (record, body) => {
      const r = await store.create(record, body);
      await refresh();
      return r;
    },
    moveCv: async (id, folderId) => {
      await store.moveCv(id, folderId);
      await refresh();
    },
    hardDeleteCv: async (id) => {
      await store.hardDeleteCv(id);
      await refresh();
    },
    createFolder: async (name) => {
      const f = await store.createFolder(name);
      await refresh();
      return f;
    },
    renameFolder: async (id, name) => {
      const f = await store.renameFolder(id, name);
      await refresh();
      return f;
    },
    deleteFolder: async (id, moveCvsTo) => {
      await store.deleteFolder(id, moveCvsTo);
      await refresh();
    },
    bulkImport: async (records) => {
      const r = await store.bulkImport(records);
      await refresh();
      return r;
    },
  };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
bun run type-check
git add client/src/features/cv-library/hooks/useCvLibrary.ts
git commit -m "feat(client): useCvLibrary hook for sidebar consumption"
```

---

## Task 16: `SyncStatusBadge` component

**Files:**
- Create: `client/src/features/cv-library/components/SyncStatusBadge.tsx`

- [ ] **Step 1: Implement the component** (no separate test — visual only, covered by editor smoke)

```tsx
import type { SyncStatus } from "../store/types";

type Props = {
  status: SyncStatus;
  authed: boolean;
};

export function SyncStatusBadge({ status, authed }: Props) {
  let label = "";
  let tone: "soft" | "amber" | "red" = "soft";
  switch (status) {
    case "saving":
      label = "Enregistrement…";
      break;
    case "saved":
      label = authed ? "Enregistré" : "Brouillon enregistré";
      break;
    case "offline":
      label = "Hors-ligne · synchronisation en attente";
      tone = "amber";
      break;
    case "error":
      label = "Échec de la synchro · Recharger";
      tone = "red";
      break;
    case "idle":
    default:
      label = authed ? "Prêt" : "Brouillon enregistré";
      break;
  }

  return (
    <button
      type="button"
      onClick={
        status === "error" ? () => window.location.reload() : undefined
      }
      disabled={status !== "error"}
      className={
        "font-mono-caps text-[10px] tracking-[0.18em] " +
        (tone === "amber"
          ? "text-amber-600"
          : tone === "red"
            ? "cursor-pointer text-red-600 hover:underline"
            : "text-[var(--color-ink-soft)]")
      }
      aria-live="polite"
    >
      {label.toUpperCase()}
    </button>
  );
}
```

- [ ] **Step 2: Wire into `CvEditor.tsx`** — replace the static "BROUILLON ENREGISTRÉ LOCALEMENT" label. Pass `useAuth0().isAuthenticated` and the persistence status from `useCvDraft`. Locate the existing label in the header section and swap.

- [ ] **Step 3: Type-check + commit**

```bash
bun run type-check
git add client/src/features/cv-library/components/SyncStatusBadge.tsx \
        client/src/features/editor/components/CvEditor.tsx
git commit -m "feat(client): SyncStatusBadge replacing static draft label"
```

---

## Task 17: `ImportLocalCvsModal` + persistent re-open button

**Files:**
- Create: `client/src/features/cv-library/components/ImportLocalCvsModal.tsx`
- Create: `client/src/features/cv-library/components/__tests__/ImportLocalCvsModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportLocalCvsModal } from "../ImportLocalCvsModal";

describe("ImportLocalCvsModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders when local has unimported CVs and not dismissed", () => {
    render(
      <ImportLocalCvsModal
        sub="auth0|123"
        anonRecords={[{ id: "cv-a", title: "A", templateId: "classique", data: {} as never, updatedAt: new Date().toISOString() }]}
        onImport={vi.fn().mockResolvedValue({ imported: [], skipped: [] })}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Importer vos CV locaux/)).toBeInTheDocument();
  });

  it("does not render when imported_ids covers all anon records", () => {
    window.localStorage.setItem(
      "cvie.migration.imported_ids.auth0|123",
      JSON.stringify(["cv-a"]),
    );
    const { container } = render(
      <ImportLocalCvsModal
        sub="auth0|123"
        anonRecords={[{ id: "cv-a", title: "A", templateId: "classique", data: {} as never, updatedAt: new Date().toISOString() }]}
        onImport={vi.fn()}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does not render when dismissed_for is set", () => {
    window.localStorage.setItem(
      "cvie.migration.dismissed_for.auth0|123",
      "true",
    );
    const { container } = render(
      <ImportLocalCvsModal
        sub="auth0|123"
        anonRecords={[{ id: "cv-a", title: "A", templateId: "classique", data: {} as never, updatedAt: new Date().toISOString() }]}
        onImport={vi.fn()}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("Importer click calls onImport then closes + records imported_ids", async () => {
    const onImport = vi.fn().mockResolvedValue({
      imported: [{ oldId: "cv-a", newId: "cv_new", title: "A", templateId: "classique", folderId: "f", updatedAt: "now" }],
      skipped: [],
    });
    render(
      <ImportLocalCvsModal
        sub="auth0|123"
        anonRecords={[{ id: "cv-a", title: "A", templateId: "classique", data: {} as never, updatedAt: new Date().toISOString() }]}
        onImport={onImport}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Importer/i }));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const stored = JSON.parse(
      window.localStorage.getItem("cvie.migration.imported_ids.auth0|123") ??
        "[]",
    ) as string[];
    expect(stored).toContain("cv-a");
  });

  it("'Ne plus me demander' + close sets dismissed_for", async () => {
    render(
      <ImportLocalCvsModal
        sub="auth0|123"
        anonRecords={[{ id: "cv-a", title: "A", templateId: "classique", data: {} as never, updatedAt: new Date().toISOString() }]}
        onImport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Ne plus me demander/i));
    fireEvent.click(screen.getByRole("button", { name: /Plus tard/i }));
    expect(
      window.localStorage.getItem("cvie.migration.dismissed_for.auth0|123"),
    ).toBe("true");
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun run --filter=@cvie/client test -- ImportLocalCvsModal
```

- [ ] **Step 3: Implement the component**

`client/src/features/cv-library/components/ImportLocalCvsModal.tsx`:

```tsx
import { useState } from "react";
import type { AnonExport, ImportResult } from "../store/types";

type Props = {
  sub: string;
  anonRecords: AnonExport[];
  onImport: (records: AnonExport[]) => Promise<ImportResult>;
};

const importedKey = (sub: string) => `cvie.migration.imported_ids.${sub}`;
const dismissedKey = (sub: string) => `cvie.migration.dismissed_for.${sub}`;

function readImportedIds(sub: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(importedKey(sub));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}
function writeImportedIds(sub: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(importedKey(sub), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
function isDismissed(sub: string): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(sub)) === "true";
  } catch {
    return false;
  }
}
function setDismissed(sub: string): void {
  try {
    window.localStorage.setItem(dismissedKey(sub), "true");
  } catch {
    /* ignore */
  }
}

export function ImportLocalCvsModal({ sub, anonRecords, onImport }: Props) {
  const imported = readImportedIds(sub);
  const dismissed = isDismissed(sub);
  const pending = anonRecords.filter((r) => !imported.has(r.id));
  const [open, setOpen] = useState(true);
  const [neverAsk, setNeverAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (dismissed || pending.length === 0 || !open) return null;

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await onImport(pending);
      const next = new Set(imported);
      for (const r of result.imported) next.add(r.oldId);
      writeImportedIds(sub, next);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    if (neverAsk) setDismissed(sub);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importer les CV locaux"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="atelier-paper w-full max-w-md rounded-lg p-6 shadow-2xl">
        <h2 className="font-display mb-3 text-[22px] tracking-[-0.02em]">
          Importer vos CV locaux ?
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          Vous avez {pending.length} CV {pending.length > 1 ? "enregistrés" : "enregistré"} sur cet appareil.
          Voulez-vous {pending.length > 1 ? "les importer" : "l'importer"} dans votre compte&nbsp;?
        </p>

        <label className="mb-5 flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={neverAsk}
            onChange={(e) => setNeverAsk(e.target.checked)}
            aria-label="Ne plus me demander"
          />
          Ne plus me demander
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Importation…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
bun run --filter=@cvie/client test -- ImportLocalCvsModal
```

- [ ] **Step 5: Commit**

```bash
git add client/src/features/cv-library/components/ImportLocalCvsModal.tsx \
        client/src/features/cv-library/components/__tests__/ImportLocalCvsModal.test.tsx
git commit -m "feat(client): ImportLocalCvsModal with dismissal flag"
```

---

## Task 18: `FolderHeader` + `CvContextMenu` + `DeleteFolderModal`

**Files:**
- Create: `client/src/features/cv-library/components/FolderHeader.tsx`
- Create: `client/src/features/cv-library/components/CvContextMenu.tsx`
- Create: `client/src/features/cv-library/components/DeleteFolderModal.tsx`

- [ ] **Step 1: `FolderHeader.tsx`** — collapsible folder section header with optional inline rename for custom folders.

```tsx
import { ChevronDown, ChevronRight, Folder as FolderIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onRename?: (newName: string) => Promise<void>;
  onDelete?: () => void;
};

export function FolderHeader({
  folder,
  count,
  expanded,
  onToggle,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const Icon = folder.isSystem && folder.ttlDays !== null ? Trash2 : FolderIcon;

  const commit = async () => {
    if (!onRename) return setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === folder.name) {
      setEditing(false);
      return;
    }
    try {
      await onRename(trimmed);
    } finally {
      setEditing(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 hover:bg-white/40"
      onContextMenu={(e) => {
        if (folder.isSystem) return;
        e.preventDefault();
        // Right-click to rename inline
        setEditing(true);
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-[var(--color-ink-soft)]" aria-hidden />
        ) : (
          <ChevronRight className="h-3 w-3 text-[var(--color-ink-soft)]" aria-hidden />
        )}
        <Icon className="h-3.5 w-3.5 text-[var(--color-ink-soft)]" aria-hidden />
        {editing && onRename ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(folder.name);
                setEditing(false);
              }
            }}
            className="font-mono-caps flex-1 bg-transparent text-[10px] tracking-[0.18em] outline-none"
            maxLength={64}
          />
        ) : (
          <span className="font-mono-caps flex-1 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            {folder.name.toUpperCase()} ({count})
          </span>
        )}
      </button>
      {!folder.isSystem && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer le dossier"
          className="opacity-0 transition group-hover:opacity-100 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: `CvContextMenu.tsx`** — right-click menu that lists folder destinations.

```tsx
import type { Folder } from "../store/types";

type Props = {
  x: number;
  y: number;
  folders: Folder[];
  isInTrash: boolean;
  onMove: (folderId: string) => void;
  onTrash?: () => void;
  onRestore?: (folderId: string) => void;
  onHardDelete?: () => void;
  onClose: () => void;
};

export function CvContextMenu({
  x,
  y,
  folders,
  isInTrash,
  onMove,
  onTrash,
  onRestore,
  onHardDelete,
  onClose,
}: Props) {
  const targets = folders.filter((f) => !(f.isSystem && f.ttlDays !== null));
  return (
    <div
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[200px] rounded-md border border-[var(--color-rule)] bg-white py-1 text-[13px] shadow-lg"
      onClick={onClose}
    >
      {!isInTrash ? (
        <>
          <div className="px-3 py-1 text-[11px] uppercase text-[var(--color-ink-soft)]">
            Déplacer vers
          </div>
          {targets.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              onClick={() => onMove(f.id)}
              className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-rule)]" />
          <button
            type="button"
            role="menuitem"
            onClick={onTrash}
            className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
          >
            Mettre à la corbeille
          </button>
        </>
      ) : (
        <>
          <div className="px-3 py-1 text-[11px] uppercase text-[var(--color-ink-soft)]">
            Restaurer vers
          </div>
          {targets.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              onClick={() => onRestore?.(f.id)}
              className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-paper-deep)]"
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-rule)]" />
          <button
            type="button"
            role="menuitem"
            onClick={onHardDelete}
            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
          >
            Supprimer définitivement
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `DeleteFolderModal.tsx`** — confirm + reassign modal.

```tsx
import { useState } from "react";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  reassignTargets: Folder[];
  onConfirm: (moveCvsTo: string) => Promise<void>;
  onCancel: () => void;
  cvCount: number;
};

export function DeleteFolderModal({
  folder,
  reassignTargets,
  onConfirm,
  onCancel,
  cvCount,
}: Props) {
  const [target, setTarget] = useState(reassignTargets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="atelier-paper w-full max-w-md rounded-lg p-6 shadow-2xl">
        <h2 className="font-display mb-3 text-[20px] tracking-[-0.02em]">
          Supprimer "{folder.name}"&nbsp;?
        </h2>
        <p className="mb-4 text-[13px] text-[var(--color-ink-soft)]">
          Ce dossier contient {cvCount} CV. Choisissez où les déplacer&nbsp;:
        </p>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mb-5 w-full rounded-md border border-[var(--color-rule)] bg-white px-3 py-2 text-[13px]"
        >
          {reassignTargets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!target) return;
              setBusy(true);
              try {
                await onConfirm(target);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !target}
            className="rounded-md bg-red-600 px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
bun run type-check
git add client/src/features/cv-library/components/FolderHeader.tsx \
        client/src/features/cv-library/components/CvContextMenu.tsx \
        client/src/features/cv-library/components/DeleteFolderModal.tsx
git commit -m "feat(client): folder UI primitives (header, context menu, delete modal)"
```

---

## Task 19: Refactor `EditorSidebar` to render folders

**Files:**
- Modify: `client/src/features/editor/components/EditorSidebar.tsx`
- Create: `client/src/features/editor/components/__tests__/EditorSidebar.folders.test.tsx`

- [ ] **Step 1: Write a failing folder UI test**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { EditorSidebar } from "../EditorSidebar";

const useCvLibraryMock = vi.fn();
vi.mock("@/features/cv-library/hooks/useCvLibrary", () => ({
  useCvLibrary: () => useCvLibraryMock(),
}));
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({ isAuthenticated: true, user: { sub: "auth0|123" } }),
}));
vi.mock("@/features/auth", () => ({
  AuthGate: ({ authed }: { authed: React.ReactNode }) => <>{authed}</>,
  LoginButton: () => null,
  UserMenu: () => null,
}));

describe("EditorSidebar (authed, folder UI)", () => {
  beforeEach(() => {
    useCvLibraryMock.mockReturnValue({
      active: [
        { id: "cv1", title: "Mon CV", templateId: "classique", folderId: "f_default", createdAt: "", updatedAt: "" },
      ],
      trash: [],
      folders: [
        { id: "f_default", name: "Mes CV", isSystem: true, ttlDays: null },
        { id: "f_alt", name: "Alternance", isSystem: false, ttlDays: null },
        { id: "f_trash", name: "Corbeille", isSystem: true, ttlDays: 30 },
      ],
      status: "saved",
      loading: false,
      refresh: vi.fn(),
      createCv: vi.fn(),
      moveCv: vi.fn(),
      hardDeleteCv: vi.fn(),
      createFolder: vi.fn(),
      renameFolder: vi.fn(),
      deleteFolder: vi.fn(),
      bulkImport: vi.fn(),
    });
  });

  it("renders folder headers including system folders", () => {
    render(
      <MemoryRouter>
        <EditorSidebar
          activeCvId="cv1"
          activeTemplateId="classique"
          collapsed={false}
          onCollapsedChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/MES CV/i)).toBeInTheDocument();
    expect(screen.getByText(/ALTERNANCE/i)).toBeInTheDocument();
    expect(screen.getByText(/CORBEILLE/i)).toBeInTheDocument();
  });

  it("Corbeille appears last in the list", () => {
    render(
      <MemoryRouter>
        <EditorSidebar
          activeCvId="cv1"
          activeTemplateId="classique"
          collapsed={false}
          onCollapsedChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    const headers = screen.getAllByText(/MES CV|ALTERNANCE|CORBEILLE/i);
    const labels = headers.map((h) => h.textContent ?? "");
    expect(labels[labels.length - 1]).toMatch(/CORBEILLE/i);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun run --filter=@cvie/client test -- EditorSidebar.folders
```

- [ ] **Step 3: Refactor `EditorSidebar.tsx`** to source data from `useCvLibrary` (when authed) instead of `readCvLibrary` directly. Render:
  - User folders sorted: system "Mes CV" first, custom folders next, system "Corbeille" last.
  - Each folder header is collapsible (state in `cvie.editor.folders.collapsed.<sub>` keyed by folder id).
  - "+ Nouveau dossier" button below the custom folder list (and above Corbeille).
  - Right-click on a CV opens `CvContextMenu` (using cursor coords); for trash CVs, show restore + hard delete.
  - Right-click on a custom folder header → inline rename; delete affordance opens `DeleteFolderModal`.
  - Anonymous flow: short-circuit to existing flat-list rendering (preserve current code path under `!isAuthenticated`).

This is the largest UI refactor. Implementation is mechanical given the primitives in Task 18. Keep the existing `useSidebarCollapsed` hook untouched.

- [ ] **Step 4: Run all client tests**

```bash
bun run --filter=@cvie/client test
```

Expected: pass.

- [ ] **Step 5: Type-check + lint**

```bash
bun run type-check
bun run lint
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/editor/components/EditorSidebar.tsx \
        client/src/features/editor/components/__tests__/EditorSidebar.folders.test.tsx
git commit -m "feat(client): folder-aware sidebar with context menus"
```

---

## Task 20: Wire `ImportLocalCvsModal` into the router

**Files:**
- Modify: `client/src/router.tsx`

- [ ] **Step 1: Update `RootLayout` to mount the modal under the auth provider**

```tsx
import { ImportLocalCvsModal } from "@/features/cv-library/components/ImportLocalCvsModal";
import { useAuth0 } from "@auth0/auth0-react";
import { useCvLibrary } from "@/features/cv-library/hooks/useCvLibrary";
import { LocalCvStore } from "@/features/cv-library/store/LocalCvStore";

function MigrationGate() {
  const { isAuthenticated, user } = useAuth0();
  const { bulkImport } = useCvLibrary();
  if (!isAuthenticated || !user?.sub) return null;
  // Read raw anon library (not the per-identity DB cache) for prompt source.
  const anon = new LocalCvStore({ namespace: "anon" });
  const [records, setRecords] = useState<AnonExport[]>([]);
  useEffect(() => {
    void (async () => {
      const list = await anon.listActive();
      const promises = list.map(async (r) => ({
        id: r.id,
        title: r.title,
        templateId: r.templateId,
        data: (await anon.read(r.id)) as CvData,
        updatedAt: r.updatedAt,
      }));
      const records = (await Promise.all(promises)).filter((r) => r.data !== null);
      setRecords(records);
    })();
  }, []);
  if (records.length === 0) return null;
  return (
    <ImportLocalCvsModal
      sub={user.sub}
      anonRecords={records}
      onImport={(rs) => bulkImport(rs)}
    />
  );
}

function RootLayout() {
  return (
    <Auth0ProviderWithNavigate>
      <MeBootstrap />
      <MigrationGate />
      <Outlet />
    </Auth0ProviderWithNavigate>
  );
}
```

(Adjust imports for `useState`, `useEffect`, and `AnonExport`/`CvData` types.)

- [ ] **Step 2: Run all tests**

```bash
bun run test
bun run type-check
bun run lint
bun run build
```

Expected: all clean. (Build catches the existing TS6133 / portfolioDisplay-type drift early.)

- [ ] **Step 3: Commit**

```bash
git add client/src/router.tsx
git commit -m "feat(client): mount ImportLocalCvsModal in root layout"
```

---

## Task 21: Manual smoke test checklist

This task is operator-driven, not subagent-friendly. Execute the steps and tick checkboxes as each pass.

**Pre-conditions:**
- Dev DB has the new schema applied. `prisma migrate status` clean.
- Auth0 dashboard unchanged from ticket 1 (allowed callback / logout URLs include `:5174` / `:5173` / `:3001`).
- A test Auth0 account exists with a few existing local CVs in `localStorage["cvie.cv.library.v1"]`.

- [ ] **Anon flow regression** — sign out, clear localStorage on `:5174`, reload `/editor`. Expect blank "Nouveau CV", PDF export still works (no Authorization header).

- [ ] **First sign-in modal** — sign in to test account. Expect `ImportLocalCvsModal` to appear. Sidebar should be empty in the background (DB library = []).

- [ ] **Import flow** — click `Importer`. Expect:
  - Toast confirmation `N CV importés`.
  - DB rows visible in Prisma Studio (`cvs` table) tied to the right `userId`.
  - Sidebar reloads with the imported CVs under "Mes CV".
  - Anon localStorage CVs still present (untouched).
  - `localStorage["cvie.migration.imported_ids.<sub>"]` contains all imported `oldId` values.

- [ ] **Folder create** — click `+ Nouveau dossier`, type "Alternance", confirm. Expect:
  - `POST /api/v1/folders` 201.
  - New folder appears between "Mes CV" and "Corbeille".

- [ ] **Move CV** — right-click an active CV → `Déplacer vers ▶ Alternance`. Expect:
  - `POST /api/v1/cv/:id/move` 200.
  - CV jumps to the new folder section.

- [ ] **Soft-delete** — right-click a CV in Alternance → `Mettre à la corbeille`. Expect:
  - `POST /api/v1/cv/:id/move` to Corbeille folder id.
  - CV appears in `Corbeille (1)` section.

- [ ] **Restore from trash** — right-click trashed CV → `Restaurer vers ▶ Mes CV`. Expect CV moves back.

- [ ] **Hard delete** — right-click trashed CV → `Supprimer définitivement`. Expect:
  - `DELETE /api/v1/cv/:id` 204.
  - Row gone from DB.

- [ ] **Active cap** — manually create 50 CVs (or seed via SQL `INSERT … SELECT generate_series(1, 50) …`), then try creating a 51st. Expect 409 toast "Limite atteinte (50 CVs)".

- [ ] **Folder cap** — create 20 custom folders, try a 21st. Expect 409 inline error.

- [ ] **Multi-tab last-write-wins** — open two tabs at the same CV. Edit field A in tab 1, field B in tab 2 within ~2s of each other. Reload both. Last write should be the one that survives (visible in DB).

- [ ] **Offline behavior** — DevTools → Network → Offline. Edit a field. Status badge flips to "Hors-ligne · synchronisation en attente". Switch to Online. Badge → Saved. PATCH visible in network log.

- [ ] **Token refresh** — drop access token in localStorage (`expires_at = 1`). Reload. Expect silent refresh, no UI flicker (avatar from ticket 1 fix).

- [ ] **Logout sanity** — sign out. Editor unmounts. Land on `/`. Local anon CVs still visible. DB library cache for the previous identity is gone.

- [ ] **`pg_cron` purge** — in Supabase SQL editor:
  ```sql
  -- Backdate one trashed CV
  UPDATE cvs SET updated_at = NOW() - INTERVAL '31 days'
   WHERE id IN (SELECT id FROM cvs WHERE folder_id IN (SELECT id FROM folders WHERE name = 'Corbeille')) LIMIT 1;
  SELECT purge_trashed_cvs();
  SELECT id, updated_at FROM cvs WHERE folder_id IN (SELECT id FROM folders WHERE name = 'Corbeille');
  ```
  Expect the backdated row gone after the function call.

- [ ] **CI pipeline** — push branch, watch `gh pr checks`. Expect lint, type-check, test, build all green.

- [ ] **Final commit / PR**

```bash
git push -u origin feat/cv-db-persistence
gh pr create --base main --head feat/cv-db-persistence --title "feat: CV DB persistence + folders (ticket 2)"
```
