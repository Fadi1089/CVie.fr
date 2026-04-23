import { useEffect, useMemo, useRef, useState } from "react";
import {
  renderCvHtml,
  type CvData,
  type OverflowMode,
  type TemplateId,
} from "@cvie/shared";
import { cn } from "@/lib/utils";

type Props = {
  templateId: TemplateId;
  cvData: CvData;
  overflowMode?: OverflowMode;
  cvScale?: number;
  className?: string;
};

const CV_WIDTH_PX = 794;
const CV_PAGE_HEIGHT_PX = 1123;

/**
 * Renders the first page of a CV at whatever width the container gives us.
 *
 * Strategy: the iframe is always 794 × 1123 px (real A4) so the CV layout
 * renders pixel-perfectly. CSS `zoom` (unlike `transform: scale`) shrinks
 * the element AND its layout box, so the parent div auto-sizes to the right
 * height with no math or aspect-ratio tricks. A ResizeObserver measures the
 * container width once on mount (and on resize) to drive the zoom ratio.
 */
export function CvFirstPagePreview({
  templateId,
  cvData,
  overflowMode = "section",
  cvScale = 1,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w <= 0) return;
      if (h <= 0) {
        setZoom(w / CV_WIDTH_PX);
        return;
      }
      // Fit inside the frame on both axes; when the frame is A4 this resolves
      // to the same value for width and height and prevents top/bottom clipping.
      setZoom(Math.min(w / CV_WIDTH_PX, h / CV_PAGE_HEIGHT_PX));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const html = useMemo(() => {
    const rendered = renderCvHtml(cvData, templateId, cvScale, overflowMode);
    const clip = `<style>
html,body{margin:0!important;padding:0!important;}
.cv-canvas{padding:0!important;}
.cv-canvas,.cv-paginated{max-height:${CV_PAGE_HEIGHT_PX}px!important;overflow:hidden!important;}
.cv-page-bg:nth-of-type(n+2),.cv-page-advisory{display:none!important;}
</style>`;
    return rendered.includes("</head>")
      ? rendered.replace("</head>", `${clip}</head>`)
      : `${clip}${rendered}`;
  }, [cvData, templateId, cvScale, overflowMode]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-[24px]",
        className,
      )}
    >
      <iframe
        srcDoc={html}
        aria-hidden="true"
        tabIndex={-1}
        title=""
        sandbox="allow-scripts"
        style={{
          width: CV_WIDTH_PX,
          height: CV_PAGE_HEIGHT_PX,
          border: 0,
          display: "block",
          zoom,
          pointerEvents: "none",
          flexShrink: 0,
          borderRadius: 24,
        }}
      />
    </div>
  );
}
