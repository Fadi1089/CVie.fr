import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import type { Auth0Claims } from "../../services/userService";
import "../../middleware/optionalAuth";

const findUniqueMock = mock(async (_args: unknown) => null);
const upsertMock = mock(async (_args: unknown) => ({ id: "u_1" }));
mock.module("../../lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock, upsert: upsertMock } },
}));

import { authRoutes } from "../auth";

function buildApp(claims: Auth0Claims | null) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userClaims", claims);
    await next();
  });
  app.route("/", authRoutes);
  return app;
}

describe("GET /me", () => {
  beforeEach(() => {
    findUniqueMock.mockClear();
  });

  it("returns 401 when claims are null", async () => {
    const res = await buildApp(null).request("/me");
    expect(res.status).toBe(401);
  });

  it("returns user row when authenticated", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u_1",
      auth0Sub: "auth0|abc",
      email: "j@e.com",
      username: null,
      createdAt: new Date("2026-04-29"),
      updatedAt: new Date("2026-04-29"),
      deletedAt: null,
    } as never);
    const res = await buildApp({ sub: "auth0|abc", email: "j@e.com" }).request("/me");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; email: string };
    expect(body.id).toBe("u_1");
    expect(body.email).toBe("j@e.com");
  });

  it("returns 404 when authenticated but no row exists (race-after-failed-upsert)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const res = await buildApp({ sub: "auth0|abc", email: "j@e.com" }).request("/me");
    expect(res.status).toBe(404);
  });
});
