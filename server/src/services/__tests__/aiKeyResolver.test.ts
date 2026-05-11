import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";

const getDecryptedKeyMock = mock(
  async (_userId: string, _provider: string) => null as string | null,
);
mock.module("../aiKeyService", () => ({
  getDecryptedKey: getDecryptedKeyMock,
}));

import { resolveProviderKey } from "../aiKeyResolver";

describe("resolveProviderKey", () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    getDecryptedKeyMock.mockClear();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  it("returns BYOK when userId has a row", async () => {
    getDecryptedKeyMock.mockResolvedValueOnce("user-anthropic-key");
    const out = await resolveProviderKey("u_1", "anthropic");
    expect(out).toEqual({ key: "user-anthropic-key", source: "byok" });
  });

  it("falls back to server env when userId has no row", async () => {
    getDecryptedKeyMock.mockResolvedValueOnce(null);
    process.env.ANTHROPIC_API_KEY = "server-key";
    const out = await resolveProviderKey("u_1", "anthropic");
    expect(out).toEqual({ key: "server-key", source: "server" });
    expect(getDecryptedKeyMock).toHaveBeenCalledWith("u_1", "anthropic");
  });

  it("uses server env directly when userId is null", async () => {
    process.env.OPENAI_API_KEY = "server-openai";
    const out = await resolveProviderKey(null, "openai");
    expect(out).toEqual({ key: "server-openai", source: "server" });
    expect(getDecryptedKeyMock).not.toHaveBeenCalled();
  });

  it("returns null when neither BYOK nor env present", async () => {
    getDecryptedKeyMock.mockResolvedValueOnce(null);
    const out = await resolveProviderKey("u_1", "google");
    expect(out).toBeNull();
  });

  it("treats empty env var as missing", async () => {
    process.env.GOOGLE_API_KEY = "";
    const out = await resolveProviderKey(null, "google");
    expect(out).toBeNull();
  });
});
