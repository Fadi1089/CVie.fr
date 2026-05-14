import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";

const KEY_PREFIX = "cvie.editor.assistant.";
const MAX_MESSAGES = 30;

function keyFor(cvId: string | null | undefined): string | null {
  if (!cvId) return null;
  return `${KEY_PREFIX}${cvId}`;
}

function load(storageKey: string | null): UIMessage[] {
  if (!storageKey) return [];
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Drop pre-existing malformed entries with empty/missing parts —
    // server rejects them and they carry no useful content.
    return (parsed as UIMessage[]).filter(
      (m) => m && Array.isArray(m.parts) && m.parts.length > 0,
    );
  } catch {
    return [];
  }
}

export function useAssistantConversation(cvId: string | null | undefined) {
  const storageKey = keyFor(cvId);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>(() => load(storageKey));

  useEffect(() => {
    setInitialMessages(load(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (messages: UIMessage[]) => {
      if (!storageKey) return;
      if (typeof window === "undefined") return;
      try {
        const sanitized = messages.filter(
          (m) => Array.isArray(m.parts) && m.parts.length > 0,
        );
        const trimmed = sanitized.slice(-MAX_MESSAGES);
        window.localStorage.setItem(storageKey, JSON.stringify(trimmed));
      } catch {
        // Quota exceeded or storage unavailable — ignore.
      }
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    if (!storageKey) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setInitialMessages([]);
  }, [storageKey]);

  return { initialMessages, persist, clear };
}
