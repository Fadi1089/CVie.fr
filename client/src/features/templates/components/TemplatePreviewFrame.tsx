import { useEffect, useMemo, useState } from "react";
import { renderCvHtml, sampleCv, type TemplateId } from "@cvie/shared";

type Props = {
  templateId: TemplateId;
};

/**
 * Live-filled A4 thumbnail. The iframe always renders at real A4 pixel
 * dimensions (794×1123 at 96 DPI); the wrapper uses CSS container queries
 * (`container-type: inline-size` + `cqi` units) to scale the iframe so it
 * exactly fills whatever width the card gave us — no white space, no overflow.
 *
 * `pointer-events: none`, `tabIndex={-1}`, `aria-hidden="true"` keep the
 * iframe fully transparent to keyboard + screen reader users; the parent
 * button is the single a11y target.
 */
export function TemplatePreviewFrame({ templateId }: Props) {
  const html = useMemo(
    () => renderCvHtml(sampleCv, templateId),
    [templateId],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    // Guard against a stale setState if the component unmounts after the
    // idle callback / timeout fires but before its cleanup runs (can also
    // happen if the schedule/cancel API pair is mismatched by a polyfill).
    let cancelled = false;
    const commit = () => {
      if (!cancelled) setReady(true);
    };
    const handle =
      typeof win.requestIdleCallback === "function"
        ? win.requestIdleCallback(commit)
        : window.setTimeout(commit, 0);
    return () => {
      cancelled = true;
      if (typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  return (
    <div className="preview-frame">
      {ready ? (
        <iframe
          srcDoc={html}
          aria-hidden="true"
          tabIndex={-1}
          title=""
          className="preview-iframe"
          /* Defense-in-depth: the srcdoc already renders only escaped content,
             but `sandbox` walls the iframe off from same-origin access, form
             submission, and top-navigation. `allow-scripts` is required so
             the pagination script inside the template can run. */
          sandbox="allow-scripts"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-full animate-pulse bg-[var(--color-paper-deep)] motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
