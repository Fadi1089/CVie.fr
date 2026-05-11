# BYOK (Bring Your Own Key) Design

> Ticket 3 of the cvie-fr roadmap (Auth0 → CV DB persistence → **BYOK** → AI agent).
>
> Auth0 (ticket 1) and CV DB persistence (ticket 2) are shipped. This ticket
> lets authed users store their own AI provider API keys, encrypted at rest,
> and have server-side AI calls (CV PDF import, CV translate, future AI
> agent) prefer those keys over the shared server env keys.
>
> Anonymous flow is untouched — anon users keep using the server's shared
> keys exclusively (no UI to set BYOK without an account).

## Goals

- Authed users supply their own keys for Anthropic, OpenAI, Google.
- Keys encrypted at rest with AES-256-GCM. Plaintext never returned by any endpoint.
- Per-request resolver: BYOK first, fall back to server env key when missing or invalid.
- Settings UI: list configured providers with last-4 hint, add / replace / delete.
- Existing AI features (`cvImport`, `cvTranslate`) consume the resolver — no behavior change for users without BYOK.

## Non-goals

- Key rotation automation. Manual replacement only this ticket.
- Audit log of decrypts (decision: out of scope, revisit if compliance asks).
- Per-key usage metering / rate limits. Existing per-route rate limits stay as-is.
- AI agent feature itself — separate ticket. BYOK only unblocks it.
- Multi-key per provider (e.g. project-scoped). One key per (user, provider).

## Locked decisions

| # | Decision |
|---|---|
| Q1 | AES-256-GCM via Node `crypto` builtin. No new crypto deps. |
| Q2 | Master key in env `BYOK_MASTER_KEY` (32-byte base64), single value, no rotation tooling this ticket. |
| Q3 | Per-record random 12-byte IV, stored alongside ciphertext + 16-byte authTag. |
| Q4 | One row per (userId, provider). Replace = update in place. |
| Q5 | `keyHint` = last 4 chars of plaintext, stored unencrypted, shown in UI only. |
| Q6 | Validation prefixes: anthropic `sk-ant-`, openai `sk-`, google `AIza`. Length sanity 20–256 chars. |
| Q7 | Resolver returns `{ key, source: "byok" \| "server" }`. Logs source label only — never key contents. |
| Q8 | If BYOK key fails at provider (401/403), do NOT silently fall back. Surface error to user; they should fix or remove the key. |
| Q9 | Settings page at `/settings/ai-keys`, requires auth (redirect to login if anon). |
| Q10 | Existing `AI_PROVIDER` env still picks default provider for server-keys path. BYOK path uses whichever provider the caller asks for. |

## Architecture

### Schema

New table `user_ai_keys`. One row per (userId, provider). Cascade-deletes with `User`.

```prisma
model UserAiKey {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider   String   // "anthropic" | "openai" | "google"
  ciphertext Bytes
  iv         Bytes
  authTag    Bytes    @map("auth_tag")
  keyHint    String   @map("key_hint")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([userId, provider])
  @@index([userId])
  @@map("user_ai_keys")
}
```

`User` gains `aiKeys UserAiKey[]`.

### Crypto module

`server/src/lib/byokCrypto.ts`:

```ts
export type EncryptedKey = { ciphertext: Buffer; iv: Buffer; authTag: Buffer };
export function encrypt(plain: string): EncryptedKey;
export function decrypt(rec: EncryptedKey): string;
export function lastFour(plain: string): string;
```

- Reads `BYOK_MASTER_KEY` once at module init (base64 → 32 bytes). Throws on startup if missing or wrong length.
- `encrypt`: random 12-byte IV, AES-256-GCM, returns ciphertext + iv + authTag.
- `decrypt`: throws on auth tag mismatch (tamper detection).
- `lastFour`: takes plaintext, returns last 4 chars for UI hint.

### REST API

All routes under `/api/v1/ai-keys`, all `requireAuth`.

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/v1/ai-keys` | — | `[{ provider, keyHint, updatedAt }]` |
| `PUT` | `/api/v1/ai-keys/:provider` | `{ key: string }` | `{ provider, keyHint, updatedAt }` |
| `DELETE` | `/api/v1/ai-keys/:provider` | — | `{ ok: true }` |

`:provider` validated against `["anthropic", "openai", "google"]`. Body validated with Zod (prefix + length). On `PUT`, encrypts and upserts the row.

### Resolver

`server/src/services/aiKeyResolver.ts`:

```ts
export type ResolvedKey = { key: string; source: "byok" | "server" };
export async function resolveProviderKey(
  userId: string | null,
  provider: "anthropic" | "openai" | "google",
): Promise<ResolvedKey | null>;
```

- If `userId` present, look up `UserAiKey` row, decrypt, return with `source: "byok"`.
- Else fall back to env: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_API_KEY`. Return with `source: "server"`.
- Returns `null` if neither path produces a key.

### Consumers

- `server/src/routes/cvImport.ts` — pass `userId` (from `optionalAuth` claims) to resolver. If null, anonymous → server keys. No user-facing change unless user has BYOK set.
- `server/src/routes/cvTranslate.ts` — same.
- Future AI agent route — uses the same resolver.

### Client UI

New feature folder `client/src/features/settings/ai-keys/`:

- `routes/AiKeysPage.tsx` — list view, add/replace/delete actions per provider. Mounted under `/settings/ai-keys`.
- `hooks/useAiKeys.ts` — CRUD via `useAuthApi`.
- `components/ProviderRow.tsx` — one row per provider (configured / not configured).
- `components/EditKeyModal.tsx` — masked input, inline validation per provider prefix.

Settings entry point added to `UserMenu` (`Paramètres → Clés IA`).

## UI requirements

- Page header: "Clés API IA" + short blurb on BYOK > server keys priority and that keys are encrypted at rest.
- Per-provider row: name, status badge ("Configurée · sk-…XXXX" / "Non configurée"), action button.
- Edit modal: provider name, masked password input, paste-friendly, validation error inline ("Doit commencer par sk-ant-").
- Delete confirms inline ("Supprimer la clé Anthropic ?").
- Empty list state: hint that adding a key uses your own quota.

## Security

- Plaintext key never logged, never returned by any endpoint, never written to DB.
- `BYOK_MASTER_KEY` distinct from `DATABASE_URL` and any client-exposed secret. Documented in `.env.example`.
- AuthTag mismatch → log a warning (no key contents, just userId + provider) and treat as "no BYOK" (surface an error so user replaces).
- Rate limit on `PUT /ai-keys/:provider` to prevent brute-forcing master key via timing — reuse existing rate-limit middleware (10 req/min per user).

## Risks

- **Master key loss = all BYOK keys unrecoverable.** Doc this in operator runbook. Out-of-band backup of `BYOK_MASTER_KEY` is operator's responsibility.
- **Master key rotation** is manual: not implemented, but design admits future migration job that decrypts with old key and re-encrypts with new. Note in spec but defer.
- **DB dump exposure:** ciphertext + IV + authTag in dump are useless without master key. Master key never in DB.
- **Provider key leakage via error messages:** when resolver hits a 401 from provider, return generic "Clé invalide" — never echo upstream body.

## Testing strategy

- `byokCrypto.test.ts` — round-trip; tamper (flip a ciphertext byte) → throws; wrong master key → throws.
- `aiKeys.test.ts` — auth gate; provider whitelist; prefix validation; GET hides plaintext; PUT then GET shows hint only; DELETE removes.
- `aiKeyResolver.test.ts` — userId+row → byok; userId no row → server env; null userId → server env; missing both → null.
- `cvImport.test.ts` (existing) — extend with BYOK case (mocked resolver returning byok source) and assert resolver called with right userId.

## Acceptance criteria

- [ ] Migration applies clean against current DB.
- [ ] `BYOK_MASTER_KEY` documented in `.env.example` with generation command.
- [ ] Authed user can add/replace/delete keys for all 3 providers via UI.
- [ ] `cvImport` uses BYOK Anthropic key when present, falls back to env when absent.
- [ ] No endpoint returns plaintext key — verified by test.
- [ ] All new tests green; existing tests green.
- [ ] Type check + lint clean.
