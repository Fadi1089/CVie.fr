import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  headerActions?: ReactNode;
  /** True while useCvDraft is loading the CV body. Suppresses the validation
   *  "frozen preview" error so we don't flash required-field complaints
   *  against an empty form. */
  hydrating?: boolean;
};

// Trackpad pinch sends many small ctrl+wheel events. exp() keeps zoom feel
// uniform across the range — equal pinch yields equal multiplicative change.
const PINCH_DELTA_PER_PX = 0.01;
const VIEW_ZOOM_MIN = 0.4;
const VIEW_ZOOM_MAX = 3;
const VIEW_ZOOM_DEFAULT = 1;
// 210mm at 96dpi. Iframe always renders at this width so the CV layout never
// reflows when the scroller resizes (e.g. splitter drag). fitZoom scales the
// rendered output down to fit narrower containers.
const DESIGN_WIDTH_PX = 794;

function clampViewZoom(value: number): number {
  if (!Number.isFinite(value)) return VIEW_ZOOM_DEFAULT;
  if (value < VIEW_ZOOM_MIN) return VIEW_ZOOM_MIN;
  if (value > VIEW_ZOOM_MAX) return VIEW_ZOOM_MAX;
  return value;
}

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
  headerActions,
  hydrating = false,
}: Props) {
  const { getValues, control } = useFormContext<CvData>();
  const { isDirty } = useFormState({ control });
  const autofillSync = useAutofillSyncContext();
  const watchedValues = useWatch({ control });
  const textSizes = useWatch({ control, name: "appearance.textSizes" });
  const mediaSize = useWatch({ control, name: "appearance.mediaSize" });
  const spacing = useWatch({ control, name: "appearance.spacing" });
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
  const textSizesRef = useRef<typeof textSizes>(textSizes);
  const mediaSizeRef = useRef<typeof mediaSize>(mediaSize);
  const spacingRef = useRef<typeof spacing>(spacing);
  const [viewZoom, setViewZoom] = useState<number>(VIEW_ZOOM_DEFAULT);
  const viewZoomRef = useRef<number>(viewZoom);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const fitZoom =
    containerWidth > 0 ? Math.min(1, containerWidth / DESIGN_WIDTH_PX) : 1;
  const effectiveZoom = viewZoom * fitZoom;
  const fitZoomRef = useRef<number>(fitZoom);
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
  useEffect(() => {
    textSizesRef.current = textSizes;
  }, [textSizes]);
  useEffect(() => {
    mediaSizeRef.current = mediaSize;
  }, [mediaSize]);
  useEffect(() => {
    spacingRef.current = spacing;
  }, [spacing]);
  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);
  useEffect(() => {
    fitZoomRef.current = fitZoom;
  }, [fitZoom]);

  // Track the scroller's content-box width. The iframe renders at a fixed
  // DESIGN_WIDTH_PX (no reflow on splitter drag); fitZoom = min(1, container /
  // design) shrinks it visually when the scroller is narrower than design.
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setContainerWidth((prev) => (prev === w ? prev : w));
      }
    });
    ro.observe(node);
    setContainerWidth(node.clientWidth);
    return () => ro.disconnect();
  }, []);

  const applyZoomAt = useCallback(
    (
      multiplier: number,
      anchor: { clientX: number; clientY: number } | null,
    ) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const oldZoom = viewZoomRef.current;
      const nextZoom = clampViewZoom(oldZoom * multiplier);
      if (nextZoom === oldZoom) return;
      const rect = scroller.getBoundingClientRect();
      const cx = anchor ? anchor.clientX - rect.left : rect.width / 2;
      const cy = anchor ? anchor.clientY - rect.top : rect.height / 2;
      const ratio = nextZoom / oldZoom;
      // Keep the content point under the cursor anchored across the zoom step.
      const nextScrollLeft = (scroller.scrollLeft + cx) * ratio - cx;
      const nextScrollTop = (scroller.scrollTop + cy) * ratio - cy;
      setViewZoom(nextZoom);
      // Schedule scroll adjust after the new transform paints so dimensions update.
      requestAnimationFrame(() => {
        if (!scrollerRef.current) return;
        scrollerRef.current.scrollLeft = Math.max(0, nextScrollLeft);
        scrollerRef.current.scrollTop = Math.max(0, nextScrollTop);
      });
    },
    [],
  );

  const applyPinchDelta = useCallback(
    (
      deltaY: number,
      deltaMode: number,
      anchor: { clientX: number; clientY: number } | null,
    ) => {
      if (!Number.isFinite(deltaY)) return;
      const lineHeightPx = 16;
      const pageStepPx = 320;
      const px =
        deltaY *
        (deltaMode === 1 ? lineHeightPx : deltaMode === 2 ? pageStepPx : 1);
      // Negative deltaY (pinch out / scroll up with ctrl) → multiplier > 1.
      const multiplier = Math.exp(-px * PINCH_DELTA_PER_PX);
      applyZoomAt(multiplier, anchor);
    },
    [applyZoomAt],
  );

  const resetZoom = useCallback(() => {
    setViewZoom(VIEW_ZOOM_DEFAULT);
  }, []);

  // Reset view zoom when the user explicitly resets the draft.
  useEffect(() => {
    if (resetNonce === undefined) return;
    setViewZoom(VIEW_ZOOM_DEFAULT);
  }, [resetNonce]);

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

  const postTextDeltas = useCallback(
    (deltas: { paragraph?: number; header?: number; title?: number } | undefined) => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      target.postMessage({ type: "cv-text-deltas", deltas: deltas ?? {} }, "*");
    },
    [],
  );

  const postMediaDelta = useCallback((value: number | undefined) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: "cv-media-delta", value }, "*");
  }, []);

  const postSpaceDeltas = useCallback(
    (deltas: { pageMargin?: number; sectionGap?: number; itemGap?: number; lineHeight?: number } | undefined) => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      const spaceOnly = deltas
        ? {
            pageMargin: deltas.pageMargin,
            sectionGap: deltas.sectionGap,
            itemGap: deltas.itemGap,
          }
        : {};
      target.postMessage({ type: "cv-space-deltas", deltas: spaceOnly }, "*");
    },
    [],
  );

  const postLineHeightDelta = useCallback((value: number | undefined) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: "cv-line-height-delta", value }, "*");
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
    if (!html) return;
    postTextDeltas(textSizes);
  }, [textSizes, html, postTextDeltas]);

  useEffect(() => {
    if (!html) return;
    postMediaDelta(mediaSize);
  }, [mediaSize, html, postMediaDelta]);

  useEffect(() => {
    if (!html) return;
    postSpaceDeltas(spacing);
  }, [spacing, html, postSpaceDeltas]);

  useEffect(() => {
    if (!html) return;
    postLineHeightDelta(spacing?.lineHeight);
  }, [spacing, html, postLineHeightDelta]);

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
        x?: number;
        y?: number;
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
      if (data?.type === "cv-pinch") {
        if (typeof data.deltaY !== "number") return;
        // Convert iframe-local pinch coords into viewport coords using the
        // iframe's current rendered rect (post-transform).
        let anchor: { clientX: number; clientY: number } | null = null;
        const iframe = iframeRef.current;
        if (iframe && typeof data.x === "number" && typeof data.y === "number") {
          const rect = iframe.getBoundingClientRect();
          const eff = viewZoomRef.current * fitZoomRef.current;
          anchor = {
            clientX: rect.left + data.x * eff,
            clientY: rect.top + data.y * eff,
          };
        }
        applyPinchDelta(data.deltaY, data.deltaMode ?? 0, anchor);
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
  }, [onSectionClick, applyPinchDelta]);

  // Trackpad pinch + ctrl+scroll fallback when the pointer is over the
  // scroller chrome (outside the iframe). Inside the iframe is handled by
  // the runtime injected in renderCvHtml.
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      applyPinchDelta(event.deltaY, event.deltaMode, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [applyPinchDelta]);

  // iOS Safari pinch via gesture events. `event.scale` is multiplicative
  // relative to the gesture start (1 = no change). Convert the running ratio
  // into incremental zoom multipliers so the focal-point math stays stable.
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    let lastScale = 1;
    let anchor: { clientX: number; clientY: number } | null = null;
    function onGestureStart(event: Event & { clientX?: number; clientY?: number }) {
      event.preventDefault();
      lastScale = 1;
      anchor =
        typeof event.clientX === "number" && typeof event.clientY === "number"
          ? { clientX: event.clientX, clientY: event.clientY }
          : null;
    }
    function onGestureChange(event: Event & { scale?: number }) {
      event.preventDefault();
      const factor = typeof event.scale === "number" ? event.scale : 1;
      if (!Number.isFinite(factor) || factor <= 0) return;
      const step = factor / lastScale;
      lastScale = factor;
      applyZoomAt(step, anchor);
    }
    function onGestureEnd(event: Event) {
      event.preventDefault();
      lastScale = 1;
      anchor = null;
    }
    node.addEventListener("gesturestart", onGestureStart as EventListener, {
      passive: false,
    });
    node.addEventListener("gesturechange", onGestureChange as EventListener, {
      passive: false,
    });
    node.addEventListener("gestureend", onGestureEnd as EventListener, {
      passive: false,
    });
    return () => {
      node.removeEventListener("gesturestart", onGestureStart as EventListener);
      node.removeEventListener("gesturechange", onGestureChange as EventListener);
      node.removeEventListener("gestureend", onGestureEnd as EventListener);
    };
  }, [applyZoomAt]);

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
        if (hydrating) {
          // Don't accuse the user of missing fields while the body is still
          // loading. Hold the previous html (if any) and show the loading
          // state until hydration completes.
          setPhase("rendering");
          setMessage(null);
          return;
        }
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
  }, [watchedValues, templateId, overflowMode, autofillSync, getValues, isDirty, hydrating]);

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
        <div className="flex items-center gap-2">
          {headerActions}
          {viewZoom !== VIEW_ZOOM_DEFAULT || fitZoom < 1 ? (
            <button
              type="button"
              onClick={resetZoom}
              disabled={viewZoom === VIEW_ZOOM_DEFAULT}
              aria-label="Reinitialiser le zoom"
              title="Reinitialiser le zoom utilisateur"
              className="font-mono-caps inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-white/80 px-2.5 text-[10px] tracking-wider text-[var(--color-ink)] transition hover:bg-white disabled:cursor-default disabled:opacity-70 disabled:hover:bg-white/80 motion-reduce:transition-none"
            >
              <span className="tabular-nums">{Math.round(effectiveZoom * 100)}%</span>
              <span aria-hidden="true">↺</span>
            </button>
          ) : null}
          {phase === "rendering" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-white/80 px-3 py-1 text-[11px] text-[var(--color-ink-soft)] shadow-sm backdrop-blur">
              <Spinner />
              Mise à jour
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="relative flex-1 overflow-auto"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      >
        {html ? (
          <>
            <div
              style={{
                width: `${Math.max(containerWidth, DESIGN_WIDTH_PX * effectiveZoom)}px`,
                minHeight: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: `${DESIGN_WIDTH_PX * effectiveZoom}px`,
                  height: `${iframeHeight * effectiveZoom}px`,
                  position: "relative",
                  flex: "none",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  aria-label="Aperçu du CV"
                  title="Aperçu du CV"
                  style={{
                    width: `${DESIGN_WIDTH_PX}px`,
                    height: `${iframeHeight}px`,
                    transform: `scale(${effectiveZoom})`,
                    transformOrigin: "0 0",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                  className={cn(
                    "block border-0 bg-transparent",
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
                    postTextDeltas(textSizesRef.current);
                    postMediaDelta(mediaSizeRef.current);
                    postSpaceDeltas(spacingRef.current);
                    postLineHeightDelta(spacingRef.current?.lineHeight);
                  }}
                />
              </div>
            </div>

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
