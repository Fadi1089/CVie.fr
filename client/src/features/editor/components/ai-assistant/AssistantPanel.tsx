import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { useAssistantChat } from "../../hooks/useAssistantChat";
import { useEditorJump } from "../../hooks/useEditorJump";
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

const COLLAPSED_HEIGHT = "52px";
const EXPANDED_HEIGHT = "min(60vh, 560px)";

export function AssistantPanel({ cvId, expanded, onExpand, onCollapse }: Props) {
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

  // First paint at collapsed height so the height transition has a starting
  // value to animate from when the chunk loads with expanded=true.
  const [primed, setPrimed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPrimed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const open = primed && expanded;

  return (
    <div
      id="cv-assistant-panel"
      className="flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--color-rule)] bg-white shadow-[0_-6px_18px_0_rgba(0,0,0,0.08)] transition-[height] duration-300 ease-out"
      style={{ height: open ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
    >
      {open ? (
        <AssistantToolbar
          onCollapse={onCollapse}
          onReset={reset}
          resetDisabled={busy || !hasMessages}
        />
      ) : (
        <AssistantHandle onExpand={onExpand} pendingCount={pending.count} />
      )}
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
