import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserRouter, Link, Navigate, useSearchParams } from "react-router";
import { renderCvHtml, sampleCv } from "@cvie/shared";
import { CvEditor } from "./features/editor";
import { EditorErrorBoundary } from "./features/editor/components/EditorErrorBoundary";
import { TemplateBrowser } from "./features/templates";

function HomePage() {
  return (
    <div className="atelier-paper relative min-h-screen overflow-hidden px-6 text-[var(--color-ink)]">
      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-7xl flex-col py-8 md:py-10">
        <header className="pt-2">
          <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            CVie.fr · Bibliotheque CV
          </p>
        </header>

        <main className="flex flex-1 items-center">
          <section className="w-full max-w-6xl">
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(320px,390px)] lg:gap-12">
              <div className="max-w-4xl">
                <h1 className="font-display text-[52px] leading-[0.92] tracking-[-0.035em] text-[var(--color-ink)] sm:text-[72px] md:text-[92px] lg:text-[104px]">
                  Le meilleur outil CV.
                  <br />
                  Gratuit. Sans paywall.
                </h1>
              </div>

              <div className="flex max-w-[24rem] flex-col justify-start pt-2 lg:pt-5">
                <p className="text-[15px] leading-relaxed text-[var(--color-ink-soft)] sm:text-[16px]">
                  Plus efficace que les outils CV premium, sans frais caches. IA
                  uniquement la ou elle est utile, compatibilite ATS garantie,
                  et toutes vos versions dans un seul espace clair.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/home"
                className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 motion-reduce:transition-none"
              >
                Ouvrir ma bibliotheque
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-[var(--color-rule)] pt-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            <span>Gratuit pour de vrai</span>
            <span>IA utile</span>
            <span>ATS garanti</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

const MAX_IFRAME_HEIGHT_PX = 20_000;

function TemplateDemoPage() {
  // Memoized so the iframe's srcDoc doesn't churn on every React re-render.
  const html = useMemo(() => renderCvHtml(sampleCv, "classique"), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(1200);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Ref-based guard so rapid double-clicks don't both slip through
  // between click and React committing the disabled state.
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
      // srcdoc iframes have origin "null" — only accept those.
      if (e.origin !== "null") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type !== "cv-height") return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      // Clamp so a rogue message can't inflate the DOM.
      const next = Math.max(0, Math.min(data.height, MAX_IFRAME_HEIGHT_PX));
      setIframeHeight((prev) => (prev === next ? prev : next));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Paint the page background gray and zero out any default html/body/root
  // spacing for the demo. Restored on unmount.
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

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-gray-600">Page introuvable</p>
      </div>
    </div>
  );
}

function EditorRouteGate() {
  const [params] = useSearchParams();
  const cvId = params.get("cv");
  if (!cvId || !cvId.trim()) {
    return <Navigate to="/home" replace />;
  }
  return (
    <EditorErrorBoundary>
      <CvEditor />
    </EditorErrorBoundary>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/home", element: <TemplateBrowser /> },
  { path: "/templates", element: <Navigate to="/home" replace /> },
  {
    path: "/editor",
    element: <EditorRouteGate />,
  },
  { path: "/template-demo", element: <TemplateDemoPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
