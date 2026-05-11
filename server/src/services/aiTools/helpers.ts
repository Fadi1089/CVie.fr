import { randomBytes } from "node:crypto";
import {
  cvDataSchema,
  type CvData,
  type Experience,
  type Formation,
  type Interest,
  type Language,
  type Skill,
} from "@cvie/shared";

export type Patch = {
  path: string;
  before: unknown;
  after: unknown;
};

export type ToolOk = { ok: true; patches: Patch[]; message?: string };
export type ToolErr = { ok: false; error: string };
export type ToolResult = ToolOk | ToolErr;

// Mutable per-request state shared by all tools in one chat turn. The route
// handler creates a fresh state per request — tools mutate `state.cv` so each
// subsequent tool call sees the result of prior calls in the same turn.
export type AssistantState = {
  cv: CvData;
};

export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

// Validate the proposed next-CV. If it parses, commit it to state and emit
// the patches. If not, return an error result so the model can self-correct
// on the next tool call.
export function commit(
  state: AssistantState,
  next: CvData,
  patches: Patch[],
): ToolResult {
  const result = cvDataSchema.safeParse(next);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.join(".") ?? "?";
    return {
      ok: false,
      error: `Le patch produit un CV invalide (${path}): ${first?.message ?? "schéma non respecté"}`,
    };
  }
  state.cv = result.data;
  return { ok: true, patches };
}

export type Section = "experiences" | "formations" | "skills" | "languages" | "interests";

export function findIndexById(
  arr: ReadonlyArray<{ id: string }>,
  id: string,
): number {
  return arr.findIndex((e) => e.id === id);
}

export function diffFields<T extends Record<string, unknown>>(
  basePath: string,
  before: T,
  after: T,
): Patch[] {
  const patches: Patch[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (!shallowEqual(b, a)) {
      patches.push({ path: `${basePath}.${key}`, before: b, after: a });
    }
  }
  return patches;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => shallowEqual(v, b[i]));
  }
  return false;
}

export type SectionItem = Experience | Formation | Skill | Language | Interest;
