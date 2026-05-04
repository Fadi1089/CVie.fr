import { LocalCvStore } from "./LocalCvStore";
import { DbCvStore } from "./DbCvStore";
import type { CvStore } from "./types";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type StoreKind =
  | { kind: "local" }
  | { kind: "db"; sub: string; fetch?: AuthFetch };

export function createCvStore(opts: StoreKind): CvStore {
  if (opts.kind === "local") {
    return new LocalCvStore({ namespace: "anon" });
  }
  const namespace = `user-${opts.sub}`;
  const local = new LocalCvStore({ namespace });
  return new DbCvStore({ namespace, local, fetch: opts.fetch });
}

export * from "./types";
export { LocalCvStore } from "./LocalCvStore";
export { DbCvStore } from "./DbCvStore";
