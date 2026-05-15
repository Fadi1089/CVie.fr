import { describe, it, expect, afterAll, mock } from "bun:test";
import { Hono } from "hono";
import type { Auth0Claims } from "../../services/userService";
import "../../middleware/optionalAuth";
import { themeRegistry } from "@cvie/shared";

import { themesRoutes } from "../themes";

function buildApp(claims: Auth0Claims | null) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userClaims", claims);
    await next();
  });
  app.route("/", themesRoutes);
  return app;
}

type ThemesResponse = {
  themes: Array<{ id: string; name: string; tier: "free" | "premium"; locked: boolean }>;
};

describe("GET /api/v1/themes", () => {
  afterAll(() => mock.restore());

  it("lists every theme with tier metadata for anonymous users", async () => {
    mock.module("../../services/userTier", () => ({
      resolveUserTier: async () => undefined,
      __resetUserTierCacheForTests: () => {},
    }));
    const res = await buildApp(null).request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ThemesResponse;
    expect(body.themes.length).toBe(themeRegistry.length);
    for (const t of body.themes) {
      expect(typeof t.id).toBe("string");
      expect(typeof t.name).toBe("string");
      expect(t.tier === "free" || t.tier === "premium").toBe(true);
      expect(typeof t.locked).toBe("boolean");
    }
  });

  it("marks premium themes as locked for free users", async () => {
    const moderne = themeRegistry.find((t) => t.meta.id === "atelier-moderne")!;
    const originalTier = moderne.meta.tier;
    (moderne.meta as { tier: "free" | "premium" }).tier = "premium";
    mock.module("../../services/userTier", () => ({
      resolveUserTier: async () => ({ tier: "free" as const }),
      __resetUserTierCacheForTests: () => {},
    }));
    try {
      const res = await buildApp({ sub: "auth0|x", email: "x@x" }).request("/");
      const body = (await res.json()) as ThemesResponse;
      const m = body.themes.find((t) => t.id === "atelier-moderne");
      expect(m?.locked).toBe(true);
    } finally {
      (moderne.meta as { tier: "free" | "premium" }).tier = originalTier;
    }
  });

  it("does not lock premium themes for premium-tier users", async () => {
    const moderne = themeRegistry.find((t) => t.meta.id === "atelier-moderne")!;
    const originalTier = moderne.meta.tier;
    (moderne.meta as { tier: "free" | "premium" }).tier = "premium";
    mock.module("../../services/userTier", () => ({
      resolveUserTier: async () => ({ tier: "premium" as const }),
      __resetUserTierCacheForTests: () => {},
    }));
    try {
      const res = await buildApp({ sub: "auth0|p", email: "p@p" }).request("/");
      const body = (await res.json()) as ThemesResponse;
      const m = body.themes.find((t) => t.id === "atelier-moderne");
      expect(m?.locked).toBe(false);
    } finally {
      (moderne.meta as { tier: "free" | "premium" }).tier = originalTier;
    }
  });
});
