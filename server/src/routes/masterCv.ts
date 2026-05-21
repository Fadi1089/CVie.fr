import { Hono } from "hono";
import * as requireAuthModule from "../middleware/requireAuth";
import { loadMasterCv } from "../services/masterCvService";

export const masterCvRoutes = new Hono();

masterCvRoutes.use("*", (c, next) =>
  requireAuthModule.requireAuth()(c, next),
);

masterCvRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const data = await loadMasterCv(userId);
  if (!data) return c.json({ code: "not_seeded" }, 404);
  return c.json({ data });
});
