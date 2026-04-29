import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

export const authRoutes = new Hono();

authRoutes.use("*", requireAuth());

authRoutes.get("/me", async (c) => {
  const claims = c.get("userClaims");
  // requireAuth has guaranteed claims is non-null.
  const user = await prisma.user.findUnique({
    where: { auth0Sub: claims!.sub },
  });
  if (!user) {
    return c.json(
      { error: "Utilisateur introuvable.", code: "NOT_FOUND" },
      404,
    );
  }
  return c.json(user);
});
