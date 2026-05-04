import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

export const authRoutes = new Hono();

authRoutes.get("/me", requireAuth(), async (c) => {
  const claims = c.get("userClaims");
  if (!claims) {
    return c.json(
      { error: "Authentification requise.", code: "UNAUTHENTICATED" },
      401,
    );
  }
  const user = await prisma.user.findUnique({
    where: { auth0Sub: claims.sub },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  // 404 is reachable when optionalAuth's lazy upsert threw (DB blip / non-auth0_sub
  // P2002) but the JWT itself was valid. The client should retry or sign out.
  if (!user) {
    return c.json(
      { error: "Utilisateur introuvable.", code: "NOT_FOUND" },
      404,
    );
  }
  return c.json(user);
});
