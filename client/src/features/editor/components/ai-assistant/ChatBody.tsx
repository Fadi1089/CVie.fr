import { useEffect, useRef } from "react";
import { isToolUIPart, type UIMessage, type UIMessagePart } from "ai";

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

function toolLabel(part: UIMessagePart<Record<string, never>, Record<string, never>>): string | null {
  if (!isToolUIPart(part)) return null;
  const name = part.type.replace(/^tool-/, "");
  if (part.state === "input-streaming" || part.state === "input-available") {
    return `→ ${name}…`;
  }
  if (part.state === "output-available") {
    const out = part.output as { ok?: boolean; patches?: unknown[]; error?: string } | undefined;
    if (out?.ok === true && Array.isArray(out.patches)) {
      const n = out.patches.length;
      return `✓ ${name} · ${n} patch${n > 1 ? "es" : ""}`;
    }
    if (out?.ok === false) {
      return `✗ ${name} · ${out.error ?? "erreur"}`;
    }
    return `✓ ${name}`;
  }
  if (part.state === "output-error") {
    return `✗ ${name} · ${part.errorText ?? "erreur"}`;
  }
  return `· ${name}`;
}

export function ChatBody({ messages, status, error }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
        <div className="text-center text-[var(--color-ink-soft)]">
          <p className="mb-1 text-[12px]">Demandez à l'assistant de modifier votre CV.</p>
          <p className="text-[11px]">
            ex: « réécris ma première puce de manière plus orientée résultat »
          </p>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <li
              key={m.id}
              className={isUser ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-lg bg-[var(--color-ink)] px-3 py-2 text-white"
                    : "max-w-[85%] rounded-lg border border-[var(--color-rule)] bg-white px-3 py-2"
                }
              >
                {m.parts.map((part, i) => {
                  const text = partText(part as never);
                  if (text) {
                    return (
                      <div key={i} className="whitespace-pre-wrap break-words">
                        {text}
                      </div>
                    );
                  }
                  const label = toolLabel(part as never);
                  if (label) {
                    return (
                      <div
                        key={i}
                        className="font-mono-caps mt-1 text-[10px] text-[var(--color-ink-soft)]"
                      >
                        {label}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
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
