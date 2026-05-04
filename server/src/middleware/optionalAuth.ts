import type { MiddlewareHandler } from "hono";
import { jwk } from "hono/jwk";
import {
  upsertUserByAuth0Sub,
  type Auth0Claims,
} from "../services/userService";

declare module "hono" {
  interface ContextVariableMap {
    userClaims: Auth0Claims | null;
  }
}

function readEnv(): { domain: string; audience: string; issuer: string } {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  const issuer = process.env.AUTH0_ISSUER;
  if (!domain || !audience || !issuer) {
    throw new Error(
      "AUTH0_DOMAIN, AUTH0_AUDIENCE, and AUTH0_ISSUER must be set.",
    );
  }
  return { domain, audience, issuer };
}

// In-memory cache: Auth0 sub -> last successful upsert epoch ms. Skips the DB
// round-trip on subsequent authed requests within the TTL. Tokens last 24h
// in prod, so a 5-minute window catches the hot path without holding stale
// rows: the first request per session writes, the rest read claims only.
const USER_UPSERT_CACHE = new Map<string, number>();
const USER_UPSERT_TTL_MS = 5 * 60_000;

/** Test-only — clear the upsert cache between specs. */
export function __resetUserUpsertCacheForTests(): void {
  USER_UPSERT_CACHE.clear();
}

export function optionalAuth(): MiddlewareHandler {
  const { domain, audience, issuer } = readEnv();
  const verify = jwk({
    jwks_uri: `https://${domain}/.well-known/jwks.json`,
    alg: ["RS256"],
    verification: { iss: issuer, aud: audience },
  });

  return async (c, next) => {
    c.set("userClaims", null);

    const header = c.req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      await next();
      return;
    }

    let claims: Auth0Claims | null = null;
    try {
      // hono/jwk validates and attaches payload at c.get('jwtPayload')
      await verify(c, async () => {});
      const payload = c.get("jwtPayload" as never) as
        | (Record<string, unknown> & { sub?: string })
        | undefined;
      const email = payload?.["https://cvie.fr/email"];
      const emailVerified = payload?.["https://cvie.fr/email_verified"];
      if (payload?.sub && typeof email === "string" && email.length > 0) {
        claims = {
          sub: payload.sub,
          email,
          email_verified:
            typeof emailVerified === "boolean" ? emailVerified : undefined,
        };
      }
    } catch (err) {
      console.warn("[optionalAuth] token rejected:", (err as Error).message);
      claims = null;
    }

    if (claims) {
      const lastUpsert = USER_UPSERT_CACHE.get(claims.sub) ?? 0;
      const fresh = Date.now() - lastUpsert < USER_UPSERT_TTL_MS;
      if (fresh) {
        c.set("userClaims", claims);
      } else {
        try {
          await upsertUserByAuth0Sub(claims);
          USER_UPSERT_CACHE.set(claims.sub, Date.now());
          c.set("userClaims", claims);
        } catch (err) {
          console.warn(
            "[optionalAuth] user upsert failed; treating as anon:",
            (err as Error).message,
          );
          c.set("userClaims", null);
        }
      }
    }

    await next();
  };
}
