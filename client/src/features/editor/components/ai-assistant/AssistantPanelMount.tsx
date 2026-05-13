import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AssistantHandle } from "./AssistantHandle";

// Heavy: pulls in `ai` + `@ai-sdk/react` (+ tooling for streaming / form ops).
// Loaded only when the user first reveals the panel — the resting gem stays
// in the main bundle so the editor entry payload doesn't pay for the
// assistant on every page load.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

type Props = {
  cvId: string | null | undefined;
};

type PanelState = "collapsed" | "peeking" | "expanded";

const HOVER_PEEK_DELAY_MS = 1000;
const HOVER_CLOSE_DELAY_MS = 240;
const REST_HEIGHT = 52; // layout space reserved for the resting gem
const PANEL_HEIGHT_CSS = "min(60vh, 560px)";
// Peek shows just the toolbar strip — a hint that the panel exists.
const PEEK_HEIGHT_CSS = "52px";
// Gem centered in the 52px strip: 14px gem, centered vertically →
// gem bottom-edge sits 19px above the strip bottom.
const GEM_BOTTOM_REST = `${(REST_HEIGHT - 20) / 2}px`;
// When expanded, gem rides up to the panel's TOP-LEFT corner — same
// vertical relationship (14px gem, ~19px from panel top).
const GEM_BOTTOM_EXPANDED = `calc(${PANEL_HEIGHT_CSS} - ${(REST_HEIGHT + 27) / 2}px)`;

export function AssistantPanelMount({ cvId }: Props) {
  const [hasMounted, setHasMounted] = useState(false);
  const [state, setState] = useState<PanelState>("collapsed");
  const [pinned, setPinned] = useState(false);
  const [sparklesHidden, setSparklesHidden] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const clearPeekTimer = () => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearPeekTimer();
    clearCloseTimer();
  }, []);

  const schedulePeek = useCallback(() => {
    clearCloseTimer();
    if (state !== "collapsed") return;
    if (peekTimerRef.current) return;
    peekTimerRef.current = setTimeout(() => {
      peekTimerRef.current = null;
      setHasMounted(true);
      setState((current) => (current === "collapsed" ? "peeking" : current));
    }, HOVER_PEEK_DELAY_MS);
  }, [state]);

  const scheduleClose = useCallback(() => {
    clearPeekTimer();
    if (pinned) return;
    if (closeTimerRef.current) return;
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (
        rootRef.current &&
        document.activeElement instanceof Node &&
        rootRef.current.contains(document.activeElement)
      ) {
        return; // keep open while focus is inside (typing)
      }
      setState("collapsed");
    }, HOVER_CLOSE_DELAY_MS);
  }, [pinned]);

  const expandFully = useCallback(() => {
    clearPeekTimer();
    clearCloseTimer();
    setHasMounted(true);
    setSparklesHidden(true);
    setState("expanded");
    setPinned(true);
  }, []);

  const handleGemClick = useCallback(() => {
    clearPeekTimer();
    clearCloseTimer();
    setSparklesHidden(true);
    if (state !== "expanded") {
      setHasMounted(true);
      setState("expanded");
      setPinned(true);
      return;
    }
    // Already expanded: clicking the gem collapses (regardless of pin).
    setState("collapsed");
    setPinned(false);
  }, [state]);

  const handleCollapse = useCallback(() => {
    clearPeekTimer();
    clearCloseTimer();
    setPinned(false);
    setState("collapsed");
  }, []);

  useEffect(() => {
    if (state === "collapsed") setSparklesHidden(false);
  }, [state]);

  useEffect(() => {
    if (state !== "expanded") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        handleCollapse();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, handleCollapse]);

  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
  const isExpanded = state === "expanded";
  const isPeeking = state === "peeking";
  const isOpen = state !== "collapsed";

  const panelHeight = isExpanded
    ? PANEL_HEIGHT_CSS
    : isPeeking
      ? PEEK_HEIGHT_CSS
      : "0px";

  const handlePeekKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isPeeking) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      expandFully();
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ height: REST_HEIGHT }}
      onMouseEnter={schedulePeek}
      onMouseLeave={scheduleClose}
    >
      {/* Panel: absolute, bottom-anchored. Grows upward from the resting strip. */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden will-change-[height]"
        style={{
          height: panelHeight,
          opacity: isOpen ? 1 : 0,
          transition: `height 480ms ${easing}, opacity 360ms ${easing}`,
          cursor: isPeeking ? "pointer" : undefined,
        }}
        aria-hidden={!isOpen}
        onClick={isPeeking ? expandFully : undefined}
        onKeyDown={isPeeking ? handlePeekKey : undefined}
        role={isPeeking ? "button" : undefined}
        tabIndex={isPeeking ? 0 : undefined}
        aria-label={isPeeking ? "Ouvrir l'assistant CVie" : undefined}
      >
        {hasMounted ? (
          <Suspense fallback={null}>
            {/* During peek, swallow pointer events so only the outer
                container handles the click-to-expand. */}
            <div style={{ pointerEvents: isPeeking ? "none" : undefined, height: "100%" }}>
              <AssistantPanel cvId={cvId} onCollapse={handleCollapse} />
            </div>
          </Suspense>
        ) : null}
      </div>

      {/* Gem: absolute, rides between rest position and panel-top */}
      <div
        className="absolute z-10"
        style={{
          left: isExpanded ? "18px" : "9px",
          bottom: isExpanded ? GEM_BOTTOM_EXPANDED : GEM_BOTTOM_REST,
          transition: `bottom 480ms ${easing}, left 480ms ${easing}`,
        }}
      >
        <AssistantHandle
          onClick={handleGemClick}
          onHoverStart={schedulePeek}
          expanded={isExpanded}
          pinned={pinned}
          showSparkles={!sparklesHidden}
        />
      </div>
    </div>
  );
}
