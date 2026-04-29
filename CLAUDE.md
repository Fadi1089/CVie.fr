# cvie-fr

## Authentication

Auth0 (EU tenant, Universal Login + PKCE). Server validates JWTs with `hono/jwk`
and lazy-upserts a Postgres `User` row keyed by `auth0Sub`. All routes are
optional-auth (anonymous flow preserved); `requireAuth` is opt-in per route.
Spec: `docs/superpowers/specs/2026-04-29-auth0-integration-design.md`.
