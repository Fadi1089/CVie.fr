import type { MiddlewareHandler } from "hono";
import { prisma } from "../lib/prisma";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

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
