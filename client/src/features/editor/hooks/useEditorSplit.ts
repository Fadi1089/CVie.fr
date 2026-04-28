import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cvie.editor.split-ratio";
export const SPLIT_MIN = 0.3;
export const SPLIT_MAX = 0.78;
export const SPLIT_DEFAULT = 0.5;

function clamp(value: number) {
  if (!Number.isFinite(value)) return SPLIT_DEFAULT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
}

function readInitial(): number {
  if (typeof window === "undefined") return SPLIT_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return SPLIT_DEFAULT;
    return clamp(parseFloat(raw));
  } catch {
    return SPLIT_DEFAULT;
  }
}

export function useEditorSplit() {
  const [ratio, setRatioState] = useState<number>(readInitial);

  const setRatio = useCallback((next: number) => {
    const clamped = clamp(next);
    setRatioState(clamped);
  }, []);

  const resetRatio = useCallback(() => {
    setRatioState(SPLIT_DEFAULT);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, ratio.toFixed(4));
    } catch {
      // ignore storage write issues
    }
  }, [ratio]);

  return { ratio, setRatio, resetRatio };
}
