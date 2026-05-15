import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { renderCvHtml, sampleCv } from "@cvie/shared";

const MAX_IFRAME_HEIGHT_PX = 20_000;

export function TemplateDemoPage() {
  const html = useMemo(() => renderCvHtml(sampleCv, "classique"), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(1200);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);

  const exportPdf = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError(null);
    let url: string | null = null;
    try {
      const res = await fetch("/api/v1/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCv),
      });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("rate-limited");
        }
        throw new Error(`PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? "cv.pdf";
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error && err.message === "rate-limited"
          ? "Trop de requêtes, réessayez dans un instant."
          : "Impossible de générer le PDF pour le moment.";
      setExportError(msg);
    } finally {
      if (url) URL.revokeObjectURL(url);
      exportingRef.current = false;
      setExporting(false);
    }
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== "null") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type !== "cv-height") return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      const next = Math.max(0, Math.min(data.height, MAX_IFRAME_HEIGHT_PX));
      setIframeHeight((prev) => (prev === next ? prev : next));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prevHtml = html.style.cssText;
    const prevBody = body.style.cssText;
    const prevRoot = root?.style.cssText ?? "";
    html.style.background = "#d8d8dc";
    html.style.margin = "0";
    html.style.padding = "0";
    body.style.background = "#d8d8dc";
    body.style.margin = "0";
    body.style.padding = "0";
    if (root) {
      root.style.margin = "0";
      root.style.padding = "0";
    }
    return () => {
      html.style.cssText = prevHtml;
      body.style.cssText = prevBody;
      if (root) root.style.cssText = prevRoot;
    };
  }, []);

  return (
    <div style={{ background: "#d8d8dc" }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 px-6 py-3"
        style={{
          background: "#f8f8fa",
        }}
      >
        <div className="flex items-baseline gap-3">
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 transition hover:text-cvie-primary-dark"
          >
            ← CVie.fr
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold tracking-tight text-cvie-primary-dark">
            Aperçu Classique
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider text-gray-500">
            Yasmine Benali
          </span>
          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="rounded-md bg-cvie-primary-dark px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {exporting ? "Génération…" : "Exporter PDF"}
          </button>
        </div>
      </header>
      {exportError ? (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700"
        >
          {exportError}
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ height: `${iframeHeight}px` }}
        className="block w-full border-0 bg-transparent"
        title="CV Classique preview"
      />
    </div>
  );
}
