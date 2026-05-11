import { useCallback, useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  DefaultChatTransport,
  isToolUIPart,
  type UIMessage,
  type UIMessagePart,
} from "ai";
import { useChat } from "@ai-sdk/react";
import type { CvData } from "@cvie/shared";
import { useAuth0 } from "@auth0/auth0-react";
import { useAssistantConversation } from "./useAssistantConversation";
import { usePendingChanges, type PendingChange } from "./usePendingChanges";

type ToolPatch = { path: string; before: unknown; after: unknown };
type ToolOkOutput = { ok: true; patches: ToolPatch[]; message?: string };

function isToolOkOutput(output: unknown): output is ToolOkOutput {
  if (!output || typeof output !== "object") return false;
  const o = output as { ok?: unknown; patches?: unknown };
  return o.ok === true && Array.isArray(o.patches);
}

export type UseAssistantChatOptions = {
  cvId: string | null | undefined;
};

export function useAssistantChat({ cvId }: UseAssistantChatOptions) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { getValues } = useFormContext<CvData>();
  const { initialMessages, persist, clear: clearConversation } =
    useAssistantConversation(cvId);
  const pending = usePendingChanges();
  const processedToolCallIds = useRef<Set<string>>(new Set());

  const cvRef = useRef<() => CvData>(() => getValues());
  cvRef.current = () => getValues();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/v1/cv/assistant/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const headers: Record<string, string> = {
            "content-type": "application/json",
          };
          if (isAuthenticated) {
            try {
              const token = await getAccessTokenSilently();
              headers.authorization = `Bearer ${token}`;
            } catch {
              // proceed unauthenticated; server will 401
            }
          }
          return {
            body: {
              cv: cvRef.current(),
              messages,
              ...(body ?? {}),
            },
            headers,
          };
        },
      }),
    [getAccessTokenSilently, isAuthenticated],
  );

  const ingestToolPart = useCallback(
    (part: UIMessagePart<Record<string, never>, Record<string, never>>) => {
      if (!isToolUIPart(part)) return;
      if (part.state !== "output-available") return;
      const toolCallId = part.toolCallId;
      if (processedToolCallIds.current.has(toolCallId)) return;
      if (!isToolOkOutput(part.output)) return;
      processedToolCallIds.current.add(toolCallId);
      const patches: Omit<PendingChange, "toolCallId">[] = part.output.patches.map(
        (p) => ({ path: p.path, before: p.before, after: p.after }),
      );
      pending.add(patches, toolCallId);
    },
    [pending],
  );

  const chat = useChat({
    messages: initialMessages,
    transport,
    onFinish: ({ message, messages }) => {
      for (const part of message.parts) {
        ingestToolPart(part as never);
      }
      persist(messages);
    },
  });

  const lastErrorString = chat.error?.message ?? null;

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      void chat.sendMessage({ text: trimmed });
    },
    [chat],
  );

  const reset = useCallback(() => {
    chat.setMessages([]);
    pending.clear();
    processedToolCallIds.current.clear();
    clearConversation();
  }, [chat, pending, clearConversation]);

  return {
    messages: chat.messages,
    status: chat.status,
    error: lastErrorString,
    send,
    stop: chat.stop,
    reset,
    pending,
  };
}
