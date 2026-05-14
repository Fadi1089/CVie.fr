import { isToolUIPart, type UIMessage } from "ai";

const SECTION_PATH_RE = /^(experiences|formations|skills|languages|interests)$/;
const ITEM_PATH_RE = /^(experiences|formations|skills|languages|interests)\[(\d+)\]/;

// Collapse tool-output patches into one path per affected item:
//   - field-level (`experiences[0].jobTitle`) → `experiences[0]`
//   - whole-array (`experiences`) → expand via before/after id diff into
//     one `experiences[id:<id>]` per added/removed item, so the chip
//     resolves to the specific row instead of the section header.
export function extractMessagePaths(m: UIMessage): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of m.parts) {
    if (!isToolUIPart(part as never)) continue;
    const tp = part as {
      state?: string;
      output?: {
        ok?: boolean;
        patches?: Array<{ path: string; before?: unknown; after?: unknown }>;
      };
    };
    if (tp.state !== "output-available") continue;
    const o = tp.output;
    if (!o?.ok || !Array.isArray(o.patches)) continue;
    for (const p of o.patches) {
      if (typeof p.path !== "string") continue;
      if (SECTION_PATH_RE.test(p.path)) {
        const section = p.path;
        const before = Array.isArray(p.before)
          ? (p.before as Array<{ id?: string }>)
          : [];
        const after = Array.isArray(p.after)
          ? (p.after as Array<{ id?: string }>)
          : [];
        const beforeIds = new Set(
          before.map((x) => x.id).filter((x): x is string => typeof x === "string"),
        );
        const afterIds = new Set(
          after.map((x) => x.id).filter((x): x is string => typeof x === "string"),
        );
        for (const id of new Set([...beforeIds, ...afterIds])) {
          const inBefore = beforeIds.has(id);
          const inAfter = afterIds.has(id);
          if (inBefore === inAfter) continue;
          const key = `${section}[id:${id}]`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(key);
        }
        continue;
      }
      const itemMatch = p.path.match(ITEM_PATH_RE);
      const key = itemMatch ? `${itemMatch[1]}[${itemMatch[2]}]` : p.path;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
