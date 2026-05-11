import { describe, expect, it, beforeEach } from "bun:test";
import { randomBytes } from "node:crypto";

import {
  encrypt,
  decrypt,
  lastFour,
  _resetForTests,
} from "../byokCrypto";

function setMasterKey(): void {
  process.env.BYOK_MASTER_KEY = randomBytes(32).toString("base64");
  _resetForTests();
}

describe("byokCrypto", () => {
  beforeEach(() => {
    setMasterKey();
  });

  it("round-trips a plaintext key", () => {
    const plain = "sk-ant-abc123XYZ7890";
    const enc = encrypt(plain);
    expect(enc.ciphertext.length).toBeGreaterThan(0);
    expect(enc.iv.length).toBe(12);
    expect(enc.authTag.length).toBe(16);
    expect(decrypt(enc)).toBe(plain);
  });

  it("produces different ciphertext / IV per encrypt for same plaintext", () => {
    const plain = "sk-ant-abc123XYZ7890";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("throws on tampered ciphertext", () => {
    const enc = encrypt("sk-ant-abc123XYZ7890");
    enc.ciphertext[0] = enc.ciphertext[0]! ^ 0xff;
    expect(() => decrypt(enc)).toThrow();
  });

  it("throws on tampered authTag", () => {
    const enc = encrypt("sk-ant-abc123XYZ7890");
    enc.authTag[0] = enc.authTag[0]! ^ 0xff;
    expect(() => decrypt(enc)).toThrow();
  });

  it("throws when decrypting with wrong master key", () => {
    const enc = encrypt("sk-ant-abc123XYZ7890");
    setMasterKey();
    expect(() => decrypt(enc)).toThrow();
  });

  it("throws when master key missing", () => {
    delete process.env.BYOK_MASTER_KEY;
    _resetForTests();
    expect(() => encrypt("foo")).toThrow(/BYOK_MASTER_KEY/);
  });

  it("throws when master key wrong length", () => {
    process.env.BYOK_MASTER_KEY = Buffer.from("tooshort").toString("base64");
    _resetForTests();
    expect(() => encrypt("foo")).toThrow(/32 bytes/);
  });

  it("lastFour returns last 4 chars", () => {
    expect(lastFour("sk-ant-abcd1234WXYZ")).toBe("WXYZ");
  });
});
