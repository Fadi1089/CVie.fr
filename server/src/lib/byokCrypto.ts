import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function loadMasterKey(): Buffer {
  const raw = process.env.BYOK_MASTER_KEY;
  if (!raw) throw new Error("BYOK_MASTER_KEY is not set.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `BYOK_MASTER_KEY must decode to ${KEY_LEN} bytes (got ${buf.length}).`,
    );
  }
  return buf;
}

let cachedKey: Buffer | null = null;
function masterKey(): Buffer {
  if (!cachedKey) cachedKey = loadMasterKey();
  return cachedKey;
}

export type EncryptedKey = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
};

export function encrypt(plain: string): EncryptedKey {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

export function decrypt(rec: EncryptedKey): string {
  const decipher = createDecipheriv(ALGO, masterKey(), rec.iv);
  decipher.setAuthTag(rec.authTag);
  const plain = Buffer.concat([
    decipher.update(rec.ciphertext),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function lastFour(plain: string): string {
  return plain.slice(-4);
}

export function _resetForTests(): void {
  cachedKey = null;
}
