import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  index: number;
  onRemove: () => void;
  removeLabel?: string;
  children: React.ReactNode;
};

/** Auto-disarm delay — long enough to commit the confirm tap on touch devices. */
const ARMED_TIMEOUT_MS = 4_000;

/**
 * A card for a single entry in a repeating section (one formation, one
 * experience, etc.). Handles the two-tap-to-delete interaction: first tap
 * arms the button (red + "Confirmer ?"), second tap fires `onRemove`.
 * Auto-disarms after `ARMED_TIMEOUT_MS` OR on blur — the timeout is the
 * safety net for touch devices where blur doesn't always fire when the
 * user looks away.
 *
 * A separate visually-hidden live region announces the armed state to
 * screen readers so they don't rely on re-announcing the focused button
 * (which is unreliable across NVDA/JAWS/VoiceOver).
 */
export function SectionCard({
  title,
  subtitle,
  index,
  onRemove,
  removeLabel = "Supprimer",
  children,
}: Props) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (blurTimeoutRef.current != null) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!armed) {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    timeoutRef.current = window.setTimeout(() => setArmed(false), ARMED_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [armed]);

  return (
    <article className="relative rounded-lg border border-[var(--color-rule)] bg-white/60 p-4 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="font-display text-[17px] font-medium text-[var(--color-ink)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-section-remove=""
          onClick={() => {
            if (armed) {
              onRemove();
            } else {
              setArmed(true);
            }
          }}
          // Defer the blur-driven disarm a tick so a tap on the button itself
          // (which fires blur-then-click on some touch browsers) still lands.
          onBlur={() => {
            if (blurTimeoutRef.current != null) {
              clearTimeout(blurTimeoutRef.current);
            }
            blurTimeoutRef.current = window.setTimeout(() => {
              if (mountedRef.current) setArmed(false);
            }, 150);
          }}
          className={cn(
            "shrink-0 rounded-md border px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 motion-reduce:transition-none",
            armed
              ? "border-red-600 bg-red-600 text-white focus-visible:ring-red-600/30"
              : "border-[var(--color-rule)] bg-white text-[var(--color-ink-soft)] hover:border-red-600/40 hover:text-red-700 focus-visible:ring-[var(--color-ink)]/20",
          )}
        >
          {armed ? "Confirmer ?" : removeLabel}
        </button>
      </header>
      <span className="sr-only" aria-live="assertive">
        {armed ? "Confirmez la suppression" : ""}
      </span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </article>
  );
}
