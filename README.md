# CVie.fr

Free, ATS-compatible CV platform with portfolio links.

## Stack

- **Monorepo**: Turbo + Bun workspaces
- **Client**: React 19, Vite, Tailwind v4, shadcn, react-router, react-hook-form
- **Server**: Hono (Bun runtime), Playwright (PDF export), pdf-parse
- **Database**: PostgreSQL (Supabase/Neon) via Prisma 7 + Neon adapter
- **Shared**: `@cvie/shared` workspace package

## Structure

```
client/   # React SPA
server/   # Hono API
shared/   # Shared types/utils
prisma/   # Schema, migrations, seed
```

## Setup

Requires Bun ≥ 1.2.4.

```bash
bun install
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, Auth0 vars
bunx prisma migrate dev
```

## Auth0 setup

Authentication uses an Auth0 EU tenant (Universal Login + PKCE). Anonymous flow is preserved — sign-in is opt-in. The server validates RS256 JWTs and lazy-upserts a `User` row keyed by `auth0Sub`.

Required env vars (see `.env.example`):

```
AUTH0_DOMAIN=cvie-fr.eu.auth0.com
AUTH0_AUDIENCE=https://api.cvie.fr
AUTH0_ISSUER=https://cvie-fr.eu.auth0.com/

VITE_AUTH0_DOMAIN=cvie-fr.eu.auth0.com
VITE_AUTH0_CLIENT_ID=<spa-client-id>
VITE_AUTH0_AUDIENCE=https://api.cvie.fr
```

Full dashboard config (callbacks, allowed origins, post-login Action) lives in `docs/superpowers/specs/2026-04-29-auth0-integration-design.md` § 10.1.

## Dev

```bash
bun dev              # all apps
bun dev:client       # client only
bun dev:server       # server only
```

Default ports: client `5173`, server `3001`.

## Build / Check

```bash
bun build
bun type-check
bun lint
bun test
```

## Figma Template Sync

The CV templates are synced from the normalized Figma file into committed JSON
and generated CSS artifacts.

```bash
FIGMA_ACCESS_TOKEN=... bun run sync:figma-templates
bun run check:template-css
bun run smoke:template-previews
```

`FIGMA_ACCESS_TOKEN` needs the `file_content:read` scope. `FIGMA_FILE_KEY` is
optional and defaults to the CV templates file.

## Env

See `.env.example`. Client vars must be prefixed `VITE_`.

## License

MIT
