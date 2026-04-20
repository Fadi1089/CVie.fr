import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { rateLimit } from "./rateLimit";

function buildApp() {
  const app = new Hono();
  app.use(
    "/limited",
    rateLimit({ max: 3, windowMs: 60_000, trustProxy: true }),
  );
  app.get("/limited", (c) => c.json({ ok: true }));
  return app;
}

describe("rateLimit middleware", () => {
  it("allows up to `max` requests then returns 429", async () => {
    const app = buildApp();
    const headers = { "x-forwarded-for": "1.2.3.4" };
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/limited", { headers });
      expect(res.status).toBe(200);
    }
    const res4 = await app.request("/limited", { headers });
    expect(res4.status).toBe(429);
    const body = (await res4.json()) as { code: string };
    expect(body.code).toBe("RATE_LIMITED");
  });

  it("tracks buckets per IP — separate clients don't share the limit", async () => {
    const app = buildApp();
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/limited", {
        headers: { "x-forwarded-for": "1.1.1.1" },
      });
      expect(res.status).toBe(200);
    }
    // Different IP gets a fresh bucket
    const res = await app.request("/limited", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    expect(res.status).toBe(200);
  });

  it("uses the first IP in a comma-separated x-forwarded-for", async () => {
    const app = buildApp();
    const headers = { "x-forwarded-for": "9.9.9.9, 10.0.0.1, 10.0.0.2" };
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/limited", { headers });
      expect(res.status).toBe(200);
    }
    const res = await app.request("/limited", { headers });
    expect(res.status).toBe(429);
    // A different first IP is unaffected
    const res2 = await app.request("/limited", {
      headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.1" },
    });
    expect(res2.status).toBe(200);
  });
});
