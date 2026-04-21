import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import {
  cvDataSchema,
  renderCvHtml,
  type CvData,
  type OverflowMode,
  type TemplateId,
} from "@cvie/shared";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useAutofillSyncContext } from "../hooks/useAutofillSync";

type Props = {
  templateId: TemplateId;
  scale: number;
  overflowMode: OverflowMode;
  resetNonce?: number;
  onSectionClick?: (payload: { sectionId: string; itemId?: string }) => void;
};

type PreviewPhase = "idle" | "rendering" | "ready" | "error";

const MAX_IFRAME_HEIGHT_PX = 20_000;
const MIN_IFRAME_HEIGHT_PX = 297 * 3.78;
// Preview debounce — Story 2-3 NFR6 (≤100 ms p50 onChange→srcDoc). 80 ms debounce
// plus ~10–20 ms render headroom on modern Chrome lands under budget. See the
// persistence debounce in `useCvDraft` (300 ms) for the separate disk-write tier.
const AUTO_REFRESH_DEBOUNCE_MS = 80;
// Unique per debounce window to avoid mark-name collisions on rapid keystrokes.
let _perfSeq = 0;
function perfMarkNames() {
  const id = ++_perfSeq;
  return {
    input: `cvie:preview:input:${id}`,
    setHtml: `cvie:preview:set-html:${id}`,
    measure: `cvie:preview:onchange-to-srcdoc:${id}`,
  };
}

function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current",
        className,
      )}
    />
  );
}

function firstValidationMessage(values: CvData): string {
  const parsed = cvDataSchema.safeParse(values);
  if (parsed.success) return "";
  return parsed.error.issues[0]?.message ?? "Vérifiez les champs du CV.";
}

export function EditorPreviewPane({
  templateId,
  scale,
  overflowMode,
  resetNonce,
  onSectionClick,
}: Props) {
  const { getValues, control } = useFormContext<CvData>();
  const { isDirty } = useFormState({ control });
  const autofillSync = useAutofillSyncContext();
  const watchedValues = useWatch({ control });
  const prefersReducedMotion = useReducedMotion();
  const [html, setHtml] = useState<string | null>(null);
  const [phase, setPhase] = useState<PreviewPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(MIN_IFRAME_HEIGHT_PX);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const htmlRef = useRef<string | null>(null);
  const phaseRef = useRef<PreviewPhase>("idle");
  // Latest scale + mode kept in refs so the iframe onLoad callback (which
  // may run after many state updates) always sends the current value, not
  // a stale closure capture from when the iframe was created.
  const scaleRef = useRef<number>(scale);
  const overflowModeRef = useRef<OverflowMode>(overflowMode);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    overflowModeRef.current = overflowMode;
  }, [overflowMode]);

  const postScale = useCallback((value: number) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: "cv-scale", scale: value }, "*");
  }, []);

  const postOverflowMode = useCallback((mode: OverflowMode) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: "cv-overflow-mode", mode }, "*");
  }, []);

  // Push scale changes into the iframe.
  useEffect(() => {
    if (!html) return;
    postScale(scale);
  }, [scale, html, postScale]);

  // Push overflow-mode changes into the iframe so re-pagination runs
  // without forcing a full srcDoc reload (flicker-free toggle).
  useEffect(() => {
    if (!html) return;
    postOverflowMode(overflowMode);
  }, [overflowMode, html, postOverflowMode]);

  useEffect(() => {
    setMessage(null);
  }, [templateId]);

  useEffect(() => {
    if (resetNonce === undefined) return;
    setHtml(null);
    setPhase("idle");
    setMessage(null);
    setIframeHeight(MIN_IFRAME_HEIGHT_PX);
  }, [resetNonce]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (iframeRef.current === null) return;
      // Origin of a sandboxed iframe (no allow-same-origin) is always "null".
      // Restore as defense-in-depth alongside the source check.
      if (e.origin !== "null") return;
      if (e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as {
        type?: string;
        height?: number;
        sectionId?: string;
        itemId?: string;
        deltaY?: number;
        deltaMode?: number;
      };
      if (data?.type === "cv-section-click") {
        if (typeof data.sectionId === "string" && data.sectionId.trim().length > 0) {
          onSectionClick?.({
            sectionId: data.sectionId,
            itemId: typeof data.itemId === "string" ? data.itemId : undefined,
          });
        }
        return;
      }
      if (data?.type === "cv-wheel") {
        if (!scrollerRef.current) return;
        if (typeof data.deltaY !== "number" || !Number.isFinite(data.deltaY)) return;
        const mode = data.deltaMode ?? 0;
        const lineHeightPx = 16;
        const pageStepPx = scrollerRef.current.clientHeight || 0;
        const multiplier = mode === 1 ? lineHeightPx : mode === 2 ? pageStepPx : 1;
        scrollerRef.current.scrollTop += data.deltaY * multiplier;
        return;
      }
      if (data?.type !== "cv-height") return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) {
        return;
      }
      const next = Math.max(
        MIN_IFRAME_HEIGHT_PX,
        Math.min(data.height, MAX_IFRAME_HEIGHT_PX),
      );
      setIframeHeight((prev) => (prev === next ? prev : next));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSectionClick]);

  useEffect(() => {
    // Dev-only perf instrumentation (Story 2-3 AC10). Mark the onChange→srcDoc
    // window; Task 6.2 captures p50/p95 in the Debug Log. Gated on DEV so no
    // `performance.mark` entries ship to prod.
    const marks = import.meta.env.DEV && typeof performance !== "undefined"
      ? perfMarkNames()
      : null;

    if (marks) {
      try { performance.mark(marks.input); } catch { /* ignore */ }
    }

    const timer = window.setTimeout(() => {
      autofillSync?.syncAll();
      const values = getValues();
      const parsed = cvDataSchema.safeParse(values);

      if (!parsed.success) {
        setPhase("error");
        setMessage(firstValidationMessage(values));
        return;
      }

      try {
        const rendered = renderCvHtml(
          parsed.data,
          templateId,
          undefined,
          overflowMode,
        );
        const willChange = htmlRef.current !== rendered;
        if (willChange) {
          setHtml(rendered);
          setPhase("rendering");
          if (marks) {
            try {
              performance.mark(marks.setHtml);
              performance.measure(marks.measure, marks.input, marks.setHtml);
              const entries = performance.getEntriesByName(marks.measure);
              const last = entries[entries.length - 1];
              if (last) {
                console.debug(`[cvie:preview] onchange→srcdoc ${last.duration.toFixed(1)}ms`);
              }
              performance.clearMarks(marks.input);
              performance.clearMarks(marks.setHtml);
              performance.clearMeasures(marks.measure);
            } catch {
              /* ignore */
            }
          }
        } else {
          // Render succeeded but HTML is unchanged — recover from any prior phase
          // (including "error") so the UI never stays stuck with a stale status.
          if (phaseRef.current !== "ready") setPhase("ready");
        }
        setMessage(null);
      } catch (err) {
        console.error("[EditorPreviewPane] renderCvHtml threw:", err);
        setPhase("error");
        setMessage(
          "Une erreur est survenue pendant le rendu. Réessayez après votre prochaine modification.",
        );
      }
    }, AUTO_REFRESH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [watchedValues, templateId, overflowMode, autofillSync, getValues, isDirty]);

  const statusText =
    phase === "rendering"
      ? "Rendu en cours…"
      : phase === "ready"
        ? "Aperçu à jour"
        : phase === "error"
          ? "Aperçu figé"
          : "En attente de vos informations";

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            Aperçu
          </p>
          <p className="text-[11px] text-[var(--color-ink-soft)]">{statusText}</p>
        </div>
        {phase === "rendering" ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-white/80 px-3 py-1 text-[11px] text-[var(--color-ink-soft)] shadow-sm backdrop-blur">
            <Spinner />
            Mise à jour
          </div>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="relative flex-1 overflow-auto rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-deep)]"
      >
        {html ? (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={html}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              aria-label="Aperçu du CV"
              title="Aperçu du CV"
              style={{ height: `${iframeHeight}px` }}
              className={cn(
                "block w-full border-0 bg-white",
                prefersReducedMotion
                  ? "transition-none"
                  : "transition-opacity duration-200",
                phase === "rendering" ? "opacity-60" : "opacity-100",
              )}
              onLoad={() => {
                setPhase("ready");
                // srcDoc reloads reset the iframe's scripting state, so the
                // pagination script restarts at its baked defaults. Replay
                // the current scale + overflow mode immediately so the
                // header selections survive every form edit that triggers
                // a fresh HTML render.
                postScale(scaleRef.current);
                postOverflowMode(overflowModeRef.current);
              }}
            />

            {phase === "error" && message ? (
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-amber-500/30 bg-amber-50/95 px-4 py-3 text-[12px] text-amber-900 shadow-sm backdrop-blur">
                <p className="font-medium">Aperçu temporairement gelé</p>
                <p className="mt-1 text-amber-900/80">{message}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center">
            <div className="max-w-[24rem] space-y-3">
              {phase === "rendering" ? (
                <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-[var(--color-rule)] bg-white/80 px-4 py-2 text-[12px] text-[var(--color-ink-soft)] shadow-sm">
                  <Spinner />
                  Analyse et rendu du CV…
                </div>
              ) : null}
              <p className="text-[13px] text-[var(--color-ink-soft)]">
                {message ?? "Remplissez vos informations — l'aperçu se met à jour automatiquement."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
