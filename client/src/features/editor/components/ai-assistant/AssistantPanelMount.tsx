import { lazy, Suspense, useEffect, useState } from "react";
import { AssistantHandle } from "./AssistantHandle";

// Heavy: pulls in `ai` + `@ai-sdk/react` (+ tooling for streaming / form ops).
// Loaded only when the user first expands the panel — the collapsed handle
// stays in the main bundle so the editor entry payload doesn't pay for the
// assistant on every page load.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

type Props = {
  cvId: string | null | undefined;
};

export function AssistantPanelMount({ cvId }: Props) {
  const [expanded, setExpanded] = useState(false);
  // Once expanded, keep the panel mounted so conversation + pending changes
  // survive a collapse/expand cycle. The lazy panel renders both collapsed
  // and expanded states internally so the pending-changes badge stays live.
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (expanded) setHasMounted(true);
  }, [expanded]);

  if (!hasMounted) {
    return <AssistantHandle onExpand={() => setExpanded(true)} />;
  }

  return (
    <Suspense
      fallback={
        <AssistantHandle onExpand={() => setExpanded(true)} />
      }
    >
      <AssistantPanel
        cvId={cvId}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onCollapse={() => setExpanded(false)}
      />
    </Suspense>
  );
}
