import { useCallback, useRef } from "react";

/**
 * Restores keyboard focus after a repeating-section entry (or bullet/tag)
 * is removed. Without this, focus falls back to `<body>` because the button
 * that the user activated just unmounted — a known a11y gap flagged in the
 * Story 2.2 code review.
 *
 * Usage:
 *   const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove();
 *   // containerRef → element containing the remove buttons
 *   // fallbackRef  → element to focus when no remove buttons remain
 *   // focusAfterRemove(removedIndex) → after RHF updates, focus survivor or fallback
 *
 * The container is scanned for elements matching `[data-section-remove]`.
 * Call `focusAfterRemove` AFTER the array mutation (React re-renders on the
 * same tick; we wait one animation frame so the DOM reflects the change).
 */
export function useFocusAfterRemove<
  C extends HTMLElement = HTMLDivElement,
  F extends HTMLElement = HTMLButtonElement,
>() {
  const containerRef = useRef<C | null>(null);
  const fallbackRef = useRef<F | null>(null);

  const focusAfterRemove = useCallback((removedIndex: number) => {
    requestAnimationFrame(() => {
      const buttons = containerRef.current?.querySelectorAll<HTMLElement>(
        "[data-section-remove]",
      );
      if (!buttons || buttons.length === 0) {
        fallbackRef.current?.focus();
        return;
      }
      const target =
        buttons[Math.min(removedIndex, buttons.length - 1)] ?? buttons[0];
      target?.focus();
    });
  }, []);

  return { containerRef, fallbackRef, focusAfterRemove };
}
