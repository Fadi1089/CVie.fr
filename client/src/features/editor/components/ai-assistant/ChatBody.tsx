import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { isToolUIPart, type UIMessage, type UIMessagePart } from "ai";
import type { CvData } from "@cvie/shared";
import { MessageMarkdown } from "./MessageMarkdown";
import { ChangeChip } from "./ChangeChip";
import { useEditorJump } from "../../hooks/useEditorJump";

type Props = {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: string | null;
};

function partText(part: UIMessagePart<Record<string, never>, Record<string, never>>): string {
  if (part.type === "text") {
    return (part as { text?: string }).text ?? "";
  }
  return "";
}

const SECTION_PATH_RE = /^(experiences|formations|skills|languages|interests)$/;
const ITEM_PATH_RE = /^(experiences|formations|skills|languages|interests)\[(\d+)\]/;

// Collapse tool-output patches into one path per affected item:
//   - field-level (`experiences[0].jobTitle`) → `experiences[0]`
//   - whole-array (`experiences`) → expand via before/after id diff into
//     one `experiences[id:<id>]` per added/removed item, so the chip
//     resolves to the specific row instead of just the section header.
function extractMessagePaths(m: UIMessage): string[] {
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
          if (inBefore === inAfter) continue; // reorders or no-ops
          const key = `${section}[id:${id}]`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(key);
        }
        continue;
      }
      // Item- or field-level path: collapse to item granularity so multi-
      // field edits on the same row share one chip.
      const itemMatch = p.path.match(ITEM_PATH_RE);
      const key = itemMatch ? `${itemMatch[1]}[${itemMatch[2]}]` : p.path;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

export function ChatBody({ messages, status, error }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const jump = useEditorJump();
  const { getValues } = useFormContext<CvData>();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const hasMessages = messages.length > 0;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-3 text-[13px] text-[var(--color-ink)]"
    >
      {!hasMessages && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
            Salut ! Je suis ton Assistant CVie.
          </p>
          <p className="text-[12px] text-[var(--color-ink-soft)]">
            Voici ce que je peux faire :
          </p>
          <p className="text-[12px] text-[var(--color-ink)]">• Analyser et améliorer ton CV</p>
          <p className="text-[12px] text-[var(--color-ink)]">• Adapter ton CV à une offre — colle le lien</p>
          <p className="text-[12px] text-[var(--color-ink)]">• Rédiger une lettre de motivation</p>
          <p className="text-[12px] text-[var(--color-ink)]">• Corriger orthographe et grammaire</p>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const paths = !isUser ? extractMessagePaths(m) : [];
          return (
            <li key={m.id} className="flex flex-col gap-1.5">
              <div className={isUser ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    isUser
                      ? "max-w-[85%] rounded-lg bg-[var(--color-ink)] px-3 py-2 text-white"
                      : "max-w-[85%] rounded-lg border border-[var(--color-rule)] bg-white px-3 py-2"
                  }
                >
                  {m.parts.map((part, i) => {
                    const p = part as { type?: string; text?: string; mediaType?: string; filename?: string; url?: string };
                    if (p.type === "file" && p.mediaType?.startsWith("image/") && p.url) {
                      return (
                        <img
                          key={i}
                          src={p.url}
                          alt={p.filename ?? "Pièce jointe"}
                          className="mt-1 max-h-40 max-w-full rounded border border-[var(--color-rule)]"
                        />
                      );
                    }
                    if (p.type === "file") {
                      return (
                        <div
                          key={i}
                          className={`mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${isUser ? "bg-white/10 text-white" : "bg-[var(--color-paper-soft,#fbf7f0)] text-[var(--color-ink-soft)]"}`}
                        >
                          <span aria-hidden>📄</span>
                          <span className="truncate">{p.filename ?? "Pièce jointe"}</span>
                        </div>
                      );
                    }
                    const text = partText(part as never);
                    if (text) {
                      if (isUser) {
                        return (
                          <div key={i} className="whitespace-pre-wrap break-words">
                            {text}
                          </div>
                        );
                      }
                      return <MessageMarkdown key={i}>{text}</MessageMarkdown>;
                    }
                    return null;
                  })}
                </div>
              </div>
              {paths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {paths.map((path, i) => (
                    <ChangeChip
                      key={`${m.id}-${i}-${path}`}
                      path={path}
                      cv={getValues()}
                      onClick={() => jump?.(path)}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {(status === "submitted" || status === "streaming") && (
        <div className="mt-2 text-[11px] text-[var(--color-ink-soft)]">
          {status === "submitted" ? "Envoi…" : "Réponse en cours…"}
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
