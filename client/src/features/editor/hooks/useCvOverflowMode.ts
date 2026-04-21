import { useCallback, useEffect, useState } from "react";
import type { OverflowMode } from "@cvie/shared";

/**
 * Session-scoped overflow strategy for the CV preview + PDF export.
 *
 * Controls whether content that doesn't fit on a page is pushed as a whole
 * `<section>` (default) or as individual leaf elements (`<article>`, `<ul>`,
 * `<p>`). Persisted in localStorage so the choice survives a refresh, but
 * deliberately stored outside the CvData draft — it's a presentation
 * preference, not part of the document. Mirrors `useCvScale`'s shape.
 */
export const CV_OVERFLOW_MODE_STORAGE_KEY = "cvie.cv.overflow-mode";
export const CV_OVERFLOW_MODE_DEFAULT: OverflowMode = "section";

function normalize(raw: string | null): OverflowMode {
  return raw === "element" ? "element" : CV_OVERFLOW_MODE_DEFAULT;
}

function loadInitial(): OverflowMode {
  if (typeof window === "undefined") return CV_OVERFLOW_MODE_DEFAULT;
  try {
    return normalize(window.localStorage.getItem(CV_OVERFLOW_MODE_STORAGE_KEY));
  } catch {
    return CV_OVERFLOW_MODE_DEFAULT;
  }
}

export function useCvOverflowMode(): {
  overflowMode: OverflowMode;
  setOverflowMode: (next: OverflowMode) => void;
} {
  const [mode, setMode] = useState<OverflowMode>(loadInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CV_OVERFLOW_MODE_STORAGE_KEY, mode);
    } catch {
      // Storage disabled (private mode, quota) — fall back to in-memory.
    }
  }, [mode]);

  const setOverflowMode = useCallback((next: OverflowMode) => {
    setMode(next === "element" ? "element" : "section");
  }, []);

  return { overflowMode: mode, setOverflowMode };
}
