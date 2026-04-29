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
      try {
        await upsertUserByAuth0Sub(claims);
        c.set("userClaims", claims);
      } catch (err) {
        console.warn(
          "[optionalAuth] user upsert failed; treating as anon:",
          (err as Error).message,
        );
        c.set("userClaims", null);
      }
    }

    await next();
  };
}
