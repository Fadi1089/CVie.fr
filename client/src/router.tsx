import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, useSearchParams } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { Auth0ProviderWithNavigate } from "./features/auth/Auth0ProviderWithNavigate";
import { useMe } from "./features/auth/hooks/useMe";
import { LocalCvStore } from "./features/cv-library/store/LocalCvStore";
import { CvLibraryProvider, useCvLibrary } from "./features/cv-library/hooks/useCvLibrary";
import { ToastProvider } from "./features/ui/Toast";
import type { AnonExport } from "./features/cv-library/store/types";
import { sampleCv } from "@cvie/shared";
import {
  createCvRecord,
  readCvLibrary,
} from "./features/cv-library/storage";

const CvEditor = lazy(() =>
  import("./features/editor/components/CvEditor").then((m) => ({ default: m.CvEditor })),
);
const EditorErrorBoundary = lazy(() =>
  import("./features/editor/components/EditorErrorBoundary").then((m) => ({
    default: m.EditorErrorBoundary,
  })),
);
const AuthCallback = lazy(() =>
  import("./features/auth/routes/AuthCallback").then((m) => ({ default: m.AuthCallback })),
);
const SettingsLayout = lazy(() =>
  import("./features/settings/routes/SettingsLayout").then((m) => ({
    default: m.SettingsLayout,
  })),
);
const ProfilePage = lazy(() =>
  import("./features/settings/routes/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const ModelsPage = lazy(() =>
  import("./features/settings/routes/ModelsPage").then((m) => ({ default: m.ModelsPage })),
);
const AiKeysPage = lazy(() =>
  import("./features/settings/ai-keys").then((m) => ({ default: m.AiKeysPage })),
);
const AiInstructionsPage = lazy(() =>
  import("./features/settings/ai-instructions").then((m) => ({ default: m.AiInstructionsPage })),
);
const MasterCvEditor = lazy(() =>
  import("./features/master-cv/components/MasterCvEditor").then((m) => ({ default: m.MasterCvEditor })),
);
const TemplateDemoPage = lazy(() =>
  import("./routes/TemplateDemoPage").then((m) => ({ default: m.TemplateDemoPage })),
);
const ImportLocalCvsModal = lazy(() =>
  import("./features/cv-library/components/ImportLocalCvsModal").then((m) => ({
    default: m.ImportLocalCvsModal,
  })),
);

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

  if (cvId && cvId.trim()) {
    return (
      <EditorErrorBoundary>
        <CvEditor />
      </EditorErrorBoundary>
    );
  }

  if (isLoading) return null;

  if (!isAuthenticated) {
    const library = readCvLibrary();
    const target = library[0] ?? createCvRecord("classique");
    const next = new URLSearchParams();
    next.set("template", target.templateId);
    next.set("cv", target.id);
    return <Navigate to={`/editor?${next.toString()}`} replace />;
  }

  return <AuthedEditorEntry />;
}

// Authed users without ?cv=: load DB library async, redirect to most recent
// CV. If empty, create one server-side and navigate. We avoid the anon
// localStorage gate (anon-style ids like `cv-${Date.now()}` would 404 in DB
// and force a save loop).
function AuthedEditorEntry() {
  const lib = useCvLibrary();
  const [createError, setCreateError] = useState<string | null>(null);
  const triedCreateRef = useRef(false);

  useEffect(() => {
    if (lib.loading || lib.active.length > 0 || triedCreateRef.current) return;
    triedCreateRef.current = true;
    void lib
      .createCv({ title: "Nouveau CV", templateId: "classique" }, sampleCv)
      .catch((err) => {
        setCreateError(
          err instanceof Error ? err.message : "Création du CV impossible.",
        );
      });
  }, [lib]);

  const target = lib.active[0];
  if (target) {
    const next = new URLSearchParams();
    next.set("template", target.templateId);
    next.set("cv", target.id);
    return <Navigate to={`/editor?${next.toString()}`} replace />;
  }

  if (lib.loading) return null;

  if (createError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-[14px] text-[var(--color-ink-soft)]">
            {createError}
          </p>
          <Link
            to="/"
            className="mt-4 inline-block font-mono-caps text-[10px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            ← Accueil
          </Link>
        </div>
      </div>
    );
  }

  return null;
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
    <Suspense fallback={null}>
      <ImportLocalCvsModal
        sub={user.sub}
        anonRecords={records}
        // The hook's bulkImport routes through useCvStore → DbCvStore with the
        // auth-injecting fetch from useAuthApi. A locally-constructed DbCvStore
        // here would miss the bearer and 401 silently.
        onImport={(rs) => lib.bulkImport(rs)}
      />
    </Suspense>
  );
}

function RootLayout() {
  return (
    <Auth0ProviderWithNavigate>
      <ToastProvider>
        <CvLibraryProvider>
          <MeBootstrap />
          <MigrationGate />
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </CvLibraryProvider>
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
      { path: "/master-cv", element: <MasterCvEditor /> },
      { path: "/template-demo", element: <TemplateDemoPage /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      {
        path: "/settings",
        element: <SettingsLayout />,
        children: [
          { path: "profile", element: <ProfilePage /> },
          { path: "ai-keys", element: <AiKeysPage /> },
          { path: "ai-instructions", element: <AiInstructionsPage /> },
          { path: "models", element: <ModelsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
