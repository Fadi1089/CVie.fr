import { useCallback, useEffect, useState } from "react";

/**
 * Session-scoped density scale for the CV preview + PDF export.
 *
 * Range is clamped to [0.7, 1.0] at the UI layer to keep content readable at
 * the low end; the server validates the wider band [0.5, 1.0] as a defense
 * against direct API callers. Persisted in localStorage so refreshing the
 * editor keeps the chosen scale, but deliberately stored outside the CvData
 * draft JSON — scale is a presentation preference, not part of the document.
 */
export const CV_SCALE_STORAGE_KEY = "cvie.cv.scale";
export const CV_SCALE_MIN = 0.7;
export const CV_SCALE_MAX = 1;
export const CV_SCALE_DEFAULT = 1;
export const CV_SCALE_STEP = 0.01;

function clamp(value: number): number {
  if (!Number.isFinite(value)) return CV_SCALE_DEFAULT;
  if (value < CV_SCALE_MIN) return CV_SCALE_MIN;
  if (value > CV_SCALE_MAX) return CV_SCALE_MAX;
  return value;
}

function loadInitialScale(): number {
  if (typeof window === "undefined") return CV_SCALE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(CV_SCALE_STORAGE_KEY);
    if (raw === null) return CV_SCALE_DEFAULT;
    const parsed = Number.parseFloat(raw);
    return clamp(parsed);
  } catch {
    return CV_SCALE_DEFAULT;
  }
}

export function useCvScale(): {
  scale: number;
  setScale: (next: number) => void;
  resetScale: () => void;
} {
  const [scale, setScaleState] = useState<number>(loadInitialScale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CV_SCALE_STORAGE_KEY, String(scale));
    } catch {
      // Storage may be disabled (private browsing, quota) — we silently
      // fall back to in-memory only; the slider still works this session.
    }
  }, [scale]);

  const setScale = useCallback((next: number) => {
    setScaleState(clamp(next));
  }, []);

  const resetScale = useCallback(() => {
    setScaleState(CV_SCALE_DEFAULT);
  }, []);

  return { scale, setScale, resetScale };
}
