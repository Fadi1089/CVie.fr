import { useAuth0 } from "@auth0/auth0-react";
import { useAssistantChat } from "../../hooks/useAssistantChat";
import { useEditorJump } from "../../hooks/useEditorJump";
import { AssistantToolbar } from "./AssistantToolbar";
import { ChatBody } from "./ChatBody";
import { ComposerBar } from "./ComposerBar";
import { PendingChangesHeader } from "./PendingChangesHeader";

type Props = {
  cvId: string | null | undefined;
  onCollapse: () => void;
};

const PANEL_HEIGHT = "min(60vh, 560px)";

export function AssistantPanel({ cvId, onCollapse }: Props) {
  const { isAuthenticated } = useAuth0();
  const jump = useEditorJump();
  const { messages, status, error, send, stop, reset, pending } = useAssistantChat({
    cvId,
    onFirstEditPath: (path) => {
      if (jump) jump(path);
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  return (
    <div
      id="cv-assistant-panel"
      role="dialog"
      aria-label="Assistant CVie"
      className="flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--color-rule)] bg-white shadow-[0_-14px_36px_-10px_rgba(15,15,30,0.18)]"
      style={{ height: PANEL_HEIGHT }}
    >
      <AssistantToolbar
        onCollapse={onCollapse}
        onReset={reset}
        resetDisabled={busy || !hasMessages}
      />
      <PendingChangesHeader
        count={pending.count}
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
