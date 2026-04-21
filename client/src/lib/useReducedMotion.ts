import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Subscribes to `prefers-reduced-motion`. JS hook covers paths where a
 * conditional `transition-none` vs `transition-opacity` class is cleaner than
 * forcing a zero-duration transition (which flashes). CSS-level
 * `motion-reduce:transition-none` variants remain the default for static
 * transitions; use this hook only when the transition itself is dynamic.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
