import { useEffect, useRef, useMemo } from "react";
import { renderResumeHtml, type CvData, type AtsMode } from "@cvie/shared";

type Props = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Record<string, unknown>;
};

export function PreviewPane({ cv, themeId, atsMode, customization }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const html = useMemo(() => {
    try {
      return renderResumeHtml(cv, { themeId, atsMode, customization });
    } catch {
      return "<!DOCTYPE html><html><body><p style=\"font-family:sans-serif;padding:2rem;color:#7B2D26\">Aperçu indisponible — vérifiez la sélection de thème.</p></body></html>";
    }
  }, [cv, themeId, atsMode, customization]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <aside
      aria-label="Aperçu du CV"
      className="relative w-full max-w-[440px] mx-auto flex flex-col items-center gap-3 p-6"
    >
      <div
        className="relative bg-white border border-[var(--atelier-rule)]/40 shadow-[0_2px_30px_rgba(0,0,0,0.05)]"
        style={{ aspectRatio: "210 / 297", width: "100%" }}
      >
        <iframe
          ref={frameRef}
          title="Aperçu du CV"
          sandbox="allow-same-origin"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      {atsMode === "ats-strict" && (
        <p
          className="text-[11px] tracking-[0.24em] text-[var(--atelier-accent)] mt-2"
          style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-display)" }}
        >
          « bon à tirer » — mode ATS strict
        </p>
      )}
    </aside>
  );
}
