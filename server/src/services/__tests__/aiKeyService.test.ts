import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";
import { randomBytes } from "node:crypto";

process.env.BYOK_MASTER_KEY = randomBytes(32).toString("base64");

const findManyMock = mock(async (_args: unknown) => [] as unknown[]);
const findUniqueMock = mock(async (_args: unknown) => null as unknown);
const upsertMock = mock(async (_args: unknown) => ({} as unknown));
const deleteManyMock = mock(async (_args: unknown) => ({ count: 0 }));
mock.module("../../lib/prisma", () => ({
  prisma: {
    userAiKey: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
  },
}));

import {
  listAiKeys,
  upsertAiKey,
  deleteAiKey,
  getDecryptedKey,
  InvalidAiKeyError,
} from "../aiKeyService";
import { encrypt, _resetForTests } from "../../lib/byokCrypto";

describe("aiKeyService", () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    findManyMock.mockClear();
    findUniqueMock.mockClear();
    upsertMock.mockClear();
    deleteManyMock.mockClear();
    _resetForTests();
  });

  describe("listAiKeys", () => {
    it("returns rows mapped to AiKeyRecord", async () => {
      const updatedAt = new Date();
      findManyMock.mockResolvedValueOnce([
        { provider: "anthropic", keyHint: "ABCD", updatedAt },
      ] as never);
      const out = await listAiKeys("u_1");
      expect(out).toEqual([
        { provider: "anthropic", keyHint: "ABCD", updatedAt },
      ]);
      expect(findManyMock.mock.calls[0]?.[0]).toMatchObject({
        where: { userId: "u_1" },
      });
    });
  });

  describe("upsertAiKey", () => {
    it("rejects an invalid prefix", async () => {
      await expect(
        upsertAiKey("u_1", "anthropic", "wrong-prefix-key-12345"),
      ).rejects.toBeInstanceOf(InvalidAiKeyError);
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it("rejects too-short key", async () => {
      await expect(
        upsertAiKey("u_1", "anthropic", "sk-ant-x"),
      ).rejects.toBeInstanceOf(InvalidAiKeyError);
    });

    it("encrypts and upserts a valid key", async () => {
      const updatedAt = new Date();
      upsertMock.mockResolvedValueOnce({
        provider: "anthropic",
        keyHint: "WXYZ",
        updatedAt,
      } as never);
      const out = await upsertAiKey(
        "u_1",
        "anthropic",
        "sk-ant-abc123def456WXYZ",
      );
      expect(out).toEqual({
        provider: "anthropic",
        keyHint: "WXYZ",
        updatedAt,
      });
      const args = upsertMock.mock.calls[0]?.[0] as {
        create: {
          ciphertext: Buffer;
          iv: Buffer;
          authTag: Buffer;
          keyHint: string;
        };
      };
      expect(args.create.ciphertext.length).toBeGreaterThan(0);
      expect(args.create.iv.length).toBe(12);
      expect(args.create.authTag.length).toBe(16);
      expect(args.create.keyHint).toBe("WXYZ");
    });
  });

  describe("deleteAiKey", () => {
    it("returns true when row removed", async () => {
      deleteManyMock.mockResolvedValueOnce({ count: 1 } as never);
      expect(await deleteAiKey("u_1", "anthropic")).toBe(true);
    });
    it("returns false when no row", async () => {
      deleteManyMock.mockResolvedValueOnce({ count: 0 } as never);
      expect(await deleteAiKey("u_1", "anthropic")).toBe(false);
    });
  });

  describe("getDecryptedKey", () => {
    it("returns null when no row", async () => {
      findUniqueMock.mockResolvedValueOnce(null as never);
      expect(await getDecryptedKey("u_1", "anthropic")).toBeNull();
    });

    it("decrypts and returns plaintext", async () => {
      const enc = encrypt("sk-ant-abc123def456WXYZ");
      findUniqueMock.mockResolvedValueOnce({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
      } as never);
      expect(await getDecryptedKey("u_1", "anthropic")).toBe(
        "sk-ant-abc123def456WXYZ",
      );
    });

    it("returns null when ciphertext tampered", async () => {
      const enc = encrypt("sk-ant-abc123def456WXYZ");
      enc.ciphertext[0] = enc.ciphertext[0]! ^ 0xff;
      findUniqueMock.mockResolvedValueOnce({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
      } as never);
      expect(await getDecryptedKey("u_1", "anthropic")).toBeNull();
    });
  });
});
