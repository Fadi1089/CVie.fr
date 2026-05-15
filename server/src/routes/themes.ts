import { Hono } from "hono";
import "../middleware/optionalAuth";
import { themeRegistry } from "@cvie/shared";
import { resolveUserTier } from "../services/userTier";

export const themesRoutes = new Hono();

themesRoutes.get("/", async (c) => {
  const userTier = await resolveUserTier(c.get("userClaims"));
  const themes = themeRegistry.map((t) => ({
    id: t.meta.id,
    name: t.meta.name,
    description: t.meta.description,
    tier: t.meta.tier,
    atsProfile: t.meta.atsProfile,
    supportsPhoto: t.meta.supportsPhoto,
    locked: t.meta.tier === "premium" && userTier?.tier !== "premium",
  }));
  c.header("Cache-Control", "no-store");
  return c.json({ themes });
});
