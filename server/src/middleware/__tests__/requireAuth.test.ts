import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import "../optionalAuth"; // load ContextVariableMap augmentation
import type { Auth0Claims } from "../../services/userService";

const findUniqueMock = mock(async (_args: unknown) => ({ id: "u_1" }));
mock.module("../../lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

import { requireAuth } from "../requireAuth";

function buildApp(claims: Auth0Claims | null) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userClaims", claims);
    await next();
  });
  app.use("/secret", requireAuth());
  app.get("/secret", (c) => c.json({ ok: true, userId: c.get("userId") }));
  return app;
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    findUniqueMock.mockClear();
  });

  it("returns 401 UNAUTHENTICATED when claims are null", async () => {
    const res = await buildApp(null).request("/secret");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 NOT_FOUND when user row does not exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null as never);
    const res = await buildApp({ sub: "auth0|x", email: "x@y.com" }).request("/secret");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("NOT_FOUND");
  });

  it("calls next and sets userId when claims and user row are present", async () => {
    const res = await buildApp({ sub: "auth0|x", email: "x@y.com" }).request("/secret");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; userId: string };
    expect(body.ok).toBe(true);
    expect(body.userId).toBe("u_1");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { auth0Sub: "auth0|x" },
      select: { id: true },
    });
  });
});
