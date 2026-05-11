import { lazy, Suspense, useState } from "react";
import { AssistantHandle } from "./AssistantHandle";

// Heavy: pulls in `ai` + `@ai-sdk/react` (+ tooling for streaming / form ops).
// Loaded only when the user first expands the panel — the collapsed handle
// stays in the main bundle so the editor entry payload doesn't pay for the
// assistant on every page load.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

type Props = {
  cvId: string | null | undefined;
};

function CollapsedShell({ onExpand }: { onExpand: () => void }) {
  return (
    <div
      id="cv-assistant-panel"
      className="flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--color-rule)] bg-white shadow-[0_-6px_18px_0_rgba(0,0,0,0.08)]"
      style={{ height: "52px" }}
    >
      <AssistantHandle onExpand={onExpand} />
    </div>
  );
}

export function AssistantPanelMount({ cvId }: Props) {
  const [hasMounted, setHasMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    setExpanded(true);
    if (!hasMounted) setHasMounted(true);
  };

  if (!hasMounted) {
    return <CollapsedShell onExpand={handleExpand} />;
  }

  return (
    <Suspense fallback={<CollapsedShell onExpand={handleExpand} />}>
      <AssistantPanel
        cvId={cvId}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onCollapse={() => setExpanded(false)}
      />
    </Suspense>
  );
}
