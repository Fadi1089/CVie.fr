import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { generateKeyPair, SignJWT, exportJWK, type JWK } from "jose";

const ISS = "https://cvie-fr.eu.auth0.com/";
const AUD = "https://api.cvie.fr";

const upsertMock = mock(async (_claims: unknown) => ({ id: "u_1" }));
mock.module("../../services/userService", () => ({
  upsertUserByAuth0Sub: upsertMock,
}));

let publicJwk: JWK & { kid: string };
let signWithKid: (
  payload: Record<string, unknown>,
  overrides?: { iss?: string; aud?: string; expSec?: number },
) => Promise<string>;

beforeEach(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const jwk = await exportJWK(publicKey);
  publicJwk = { ...jwk, alg: "RS256", use: "sig", kid: "test-kid" };

  signWithKid = (payload, overrides = {}) =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
      .setIssuer(overrides.iss ?? ISS)
      .setAudience(overrides.aud ?? AUD)
      .setIssuedAt()
      .setExpirationTime(overrides.expSec ?? Math.floor(Date.now() / 1000) + 60)
      .sign(privateKey);

  // Stub global fetch for the JWKS endpoint.
  (globalThis as unknown as { fetch: typeof fetch }).fetch = mock(async (url: string) => {
    if (typeof url === "string" && url.includes("/.well-known/jwks.json")) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as unknown as typeof fetch;

  upsertMock.mockClear();
  process.env.AUTH0_DOMAIN = "cvie-fr.eu.auth0.com";
  process.env.AUTH0_AUDIENCE = AUD;
  process.env.AUTH0_ISSUER = ISS;
});

async function buildApp() {
  const { optionalAuth } = await import("../optionalAuth");
  const app = new Hono();
  app.use("*", optionalAuth());
  app.get("/probe", (c) =>
    c.json({ claims: c.get("userClaims" as never) ?? null }),
  );
  return app;
}

describe("optionalAuth middleware", () => {
  it("sets userClaims=null and continues when no Authorization header", async () => {
    const app = await buildApp();
    const res = await app.request("/probe");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claims: unknown };
    expect(body.claims).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("sets userClaims and upserts on a valid Bearer token", async () => {
    const app = await buildApp();
    const token = await signWithKid({
      sub: "google-oauth2|108472",
      "https://cvie.fr/email": "jane@example.com",
      "https://cvie.fr/email_verified": true,
    });
    const res = await app.request("/probe", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      claims: { sub: string; email: string } | null;
    };
    expect(body.claims?.sub).toBe("google-oauth2|108472");
    expect(body.claims?.email).toBe("jane@example.com");
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("treats tokens missing the custom email claim as anonymous", async () => {
    const app = await buildApp();
    const token = await signWithKid({ sub: "auth0|noemail" });
    const res = await app.request("/probe", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("treats expired tokens as anonymous", async () => {
    const app = await buildApp();
    const token = await signWithKid(
      { sub: "auth0|x", "https://cvie.fr/email": "x@y.com" },
      { expSec: Math.floor(Date.now() / 1000) - 60 },
    );
    const res = await app.request("/probe", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("treats wrong-audience tokens as anonymous", async () => {
    const app = await buildApp();
    const token = await signWithKid(
      { sub: "auth0|x", "https://cvie.fr/email": "x@y.com" },
      { aud: "https://other.example" },
    );
    const res = await app.request("/probe", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
  });

  it("treats wrong-issuer tokens as anonymous", async () => {
    const app = await buildApp();
    const token = await signWithKid(
      { sub: "auth0|x", "https://cvie.fr/email": "x@y.com" },
      { iss: "https://attacker.example/" },
    );
    const res = await app.request("/probe", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
  });

  it("treats malformed Authorization header as anonymous", async () => {
    const app = await buildApp();
    const res = await app.request("/probe", {
      headers: { authorization: "garbage" },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
  });

  it("falls back to anonymous when JWKS fetch fails", async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = mock(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const app = await buildApp();
    const res = await app.request("/probe", {
      headers: { authorization: "Bearer something" },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { claims: unknown }).claims).toBeNull();
  });
});
