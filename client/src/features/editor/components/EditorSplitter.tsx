import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SPLIT_MAX, SPLIT_MIN } from "../hooks/useEditorSplit";

type EditorSplitterProps = {
  ratio: number;
  onChange: (next: number) => void;
  onReset?: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
};

const KEYBOARD_STEP = 0.02;

export function EditorSplitter({
  ratio,
  onChange,
  onReset,
  containerRef,
}: EditorSplitterProps) {
  const draggingRef = useRef(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = (clientX - rect.left) / rect.width;
      onChange(next);
    },
    [containerRef, onChange],
  );

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    }
    function endDrag() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.classList.remove("editor-splitter-dragging");
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [updateFromClientX]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    draggingRef.current = true;
    document.body.classList.add("editor-splitter-dragging");
    // Prime the position to wherever the click started.
    updateFromClientX(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(ratio - KEYBOARD_STEP);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(ratio + KEYBOARD_STEP);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(SPLIT_MIN);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(SPLIT_MAX);
    } else if ((e.key === "0" || e.key === "Enter") && onReset) {
      e.preventDefault();
      onReset();
    }
  };

  const percent = Math.round(ratio * 100);

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner editeur et apercu"
      aria-valuemin={Math.round(SPLIT_MIN * 100)}
      aria-valuemax={Math.round(SPLIT_MAX * 100)}
      aria-valuenow={percent}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className={cn(
        "editor-splitter relative hidden shrink-0 cursor-col-resize select-none md:block",
        "focus-visible:outline-none",
      )}
    >
      <span className="editor-splitter__line" aria-hidden="true" />
      <span className="editor-splitter__grip" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
