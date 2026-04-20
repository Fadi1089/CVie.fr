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
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, JWT secrets
bunx prisma migrate dev
```

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

## Env

See `.env.example`. Client vars must be prefixed `VITE_`.

## License

MIT
