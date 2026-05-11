# cvie-fr

## Authentication

Auth0 (EU tenant, Universal Login + PKCE). Server validates JWTs with `hono/jwk`
and lazy-upserts a Postgres `User` row keyed by `auth0Sub`. All routes are
optional-auth (anonymous flow preserved); `requireAuth` is opt-in per route.
Spec: `docs/superpowers/specs/2026-04-29-auth0-integration-design.md`.

## BYOK

User-provided AI provider keys are encrypted at rest with AES-256-GCM via the
`BYOK_MASTER_KEY` env var. Server reads keys via `resolveProviderKey` in
`server/src/services/aiKeyResolver.ts` (BYOK first, env fallback). Settings
page at `/settings/ai-keys`. Spec: `docs/superpowers/specs/2026-05-07-byok-design.md`.
