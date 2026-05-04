import type { MiddlewareHandler } from "hono";

// Precondition: must be mounted after `optionalAuth`, which writes `userClaims`.
export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const claims = c.get("userClaims");
    if (!claims) {
      return c.json(
        { error: "Authentification requise.", code: "UNAUTHENTICATED" },
        401,
      );
    }
    await next();
  };
}
