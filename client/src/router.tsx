import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, useSearchParams } from "react-router";
import { renderCvHtml, sampleCv } from "@cvie/shared";
import { useAuth0 } from "@auth0/auth0-react";
import { Auth0ProviderWithNavigate, AuthCallback, useMe } from "./features/auth";
import { ImportLocalCvsModal } from "./features/cv-library/components/ImportLocalCvsModal";
import { LocalCvStore } from "./features/cv-library/store/LocalCvStore";
import { useCvLibrary } from "./features/cv-library/hooks/useCvLibrary";
import { ToastProvider } from "./features/ui/Toast";
import type { AnonExport } from "./features/cv-library/store/types";
import { CvEditor } from "./features/editor";
import { EditorErrorBoundary } from "./features/editor/components/EditorErrorBoundary";
import {
  createCvRecord,
  readCvLibrary,
} from "./features/cv-library/storage";

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
                to="/editor"
                className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 motion-reduce:transition-none"
              >
                Ouvrir l'editeur
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
  const { isAuthenticated, isLoading } = useAuth0();
  const cvId = params.get("cv");

  // Authed users land on a CV id that exists server-side. The DB list isn't
  // available synchronously, so block render with a transient "loading"
  // (Auth0 isLoading) and let the editor itself surface "no CV selected"
  // when the URL has no ?cv= and the library is empty. We avoid the anon
  // localStorage gate entirely for authed sessions because anon-style ids
  // (`cv-${Date.now()}`) won't exist in the DB and would force every save
  // into a 404 loop.
  if (!cvId || !cvId.trim()) {
    if (isLoading) {
      return null;
    }
    if (!isAuthenticated) {
      const library = readCvLibrary();
      const target = library[0] ?? createCvRecord("classique");
      const next = new URLSearchParams();
      next.set("template", target.templateId);
      next.set("cv", target.id);
      return <Navigate to={`/editor?${next.toString()}`} replace />;
    }
    // Authed: defer to the sidebar — it lists the user's DB CVs and the
    // user picks one, or clicks "+ Nouveau CV" which creates a server row
    // and navigates with the new id. Send them back to the home page in
    // the meantime so we don't render an editor pinned to a missing id.
    return <Navigate to="/" replace />;
  }
  return (
    <EditorErrorBoundary>
      <CvEditor />
    </EditorErrorBoundary>
  );
}

function MeBootstrap() {
  useMe();
  return null;
}

function MigrationGate() {
  const { isAuthenticated, user } = useAuth0();
  const lib = useCvLibrary();
  const [records, setRecords] = useState<AnonExport[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    let alive = true;
    void (async () => {
      const anon = new LocalCvStore({ namespace: "anon" });
      const list = await anon.listActive();
      const promises = list.map(async (r) => {
        const data = await anon.read(r.id);
        if (!data) return null;
        return {
          id: r.id,
          title: r.title,
          templateId: r.templateId,
          data,
          updatedAt: r.updatedAt,
        } satisfies AnonExport;
      });
      const all = (await Promise.all(promises)).filter(
        (r): r is AnonExport => r !== null,
      );
      if (alive) setRecords(all);
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.sub]);

  if (!isAuthenticated || !user?.sub || records.length === 0) return null;
  return (
    <ImportLocalCvsModal
      sub={user.sub}
      anonRecords={records}
      // The hook's bulkImport routes through useCvStore → DbCvStore with the
      // auth-injecting fetch from useAuthApi. A locally-constructed DbCvStore
      // here would miss the bearer and 401 silently.
      onImport={(rs) => lib.bulkImport(rs)}
    />
  );
}

function RootLayout() {
  return (
    <Auth0ProviderWithNavigate>
      <ToastProvider>
        <MeBootstrap />
        <MigrationGate />
        <Outlet />
      </ToastProvider>
    </Auth0ProviderWithNavigate>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/home", element: <Navigate to="/editor" replace /> },
      { path: "/templates", element: <Navigate to="/editor" replace /> },
      { path: "/editor", element: <EditorRouteGate /> },
      { path: "/template-demo", element: <TemplateDemoPage /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
