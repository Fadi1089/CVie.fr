import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import "../optionalAuth"; // load ContextVariableMap augmentation
import { requireAuth } from "../requireAuth";
import type { Auth0Claims } from "../../services/userService";

function buildApp(claims: Auth0Claims | null) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userClaims", claims);
    await next();
  });
  app.use("/secret", requireAuth());
  app.get("/secret", (c) => c.json({ ok: true }));
  return app;
}

describe("requireAuth middleware", () => {
  it("returns 401 UNAUTHENTICATED when claims are null", async () => {
    const res = await buildApp(null).request("/secret");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("calls next when claims are present", async () => {
    const res = await buildApp({ sub: "auth0|x", email: "x@y.com" }).request("/secret");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
