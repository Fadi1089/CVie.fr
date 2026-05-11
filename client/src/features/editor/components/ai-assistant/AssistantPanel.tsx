import { useAuth0 } from "@auth0/auth0-react";
import { useAssistantChat } from "../../hooks/useAssistantChat";
import { AssistantHandle } from "./AssistantHandle";
import { AssistantToolbar } from "./AssistantToolbar";
import { ChatBody } from "./ChatBody";
import { ComposerBar } from "./ComposerBar";
import { PendingChangesHeader } from "./PendingChangesHeader";

type Props = {
  cvId: string | null | undefined;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
};

export function AssistantPanel({ cvId, expanded, onExpand, onCollapse }: Props) {
  const { isAuthenticated } = useAuth0();
  const { messages, status, error, send, stop, reset, pending } = useAssistantChat({
    cvId,
  });

  const busy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  return (
    <div className="relative">
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        }`}
        aria-hidden={expanded}
      >
        <div className="overflow-hidden">
          <AssistantHandle onExpand={onExpand} pendingCount={pending.count} />
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div
            id="cv-assistant-panel"
            className="flex h-[min(60vh,560px)] w-full flex-col overflow-hidden border border-[var(--color-rule)] bg-white shadow-[0_-6px_18px_0_rgba(0,0,0,0.1)]"
          >
            <AssistantToolbar
              onCollapse={onCollapse}
              onReset={reset}
              resetDisabled={busy || !hasMessages}
            />
            <PendingChangesHeader
              changes={pending.changes}
              onKeepAll={pending.keepAll}
              onRevertAll={pending.revertAll}
            />
            {!isAuthenticated && (
              <div className="border-b border-[var(--color-rule)] bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                Connectez-vous pour utiliser l'assistant.
              </div>
            )}
            <ChatBody messages={messages} status={status} error={error} />
            <ComposerBar
              disabled={!isAuthenticated}
              busy={busy}
              onSend={send}
              onStop={stop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssistantPanel;
