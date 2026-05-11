import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { useAssistantChat } from "../../hooks/useAssistantChat";
import { AssistantHandle } from "./AssistantHandle";
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

  if (!expanded) {
    return <AssistantHandle onExpand={onExpand} pendingCount={pending.count} />;
  }

  return (
    <div
      id="cv-assistant-panel"
      className="flex h-[min(60vh,560px)] w-full flex-col overflow-hidden rounded-md border border-[var(--color-rule)] bg-white shadow-sm"
    >
      <header className="flex h-[44px] items-center justify-between border-b border-[var(--color-rule)] px-3">
        <span className="font-mono-caps flex items-center gap-2 text-[11px] text-[var(--color-ink)]">
          <span aria-hidden>✨</span>
          Assistant rédacteur
        </span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button size="xs" variant="ghost" onClick={reset} disabled={busy}>
              Nouvelle conversation
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={onCollapse}>
            Réduire
          </Button>
        </div>
      </header>
      <PendingChangesHeader
        changes={pending.changes}
        onKeep={pending.keep}
        onRevert={pending.revert}
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
  );
}

export default AssistantPanel;
