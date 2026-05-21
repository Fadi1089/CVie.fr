import { NavLink, Navigate, Outlet, useLocation } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/settings/profile", index: "01", label: "Profil" },
  { to: "/settings/ai-keys", index: "02", label: "Clés API" },
  { to: "/settings/models", index: "03", label: "Modèles" },
  { to: "/settings/ai-instructions", index: "04", label: "Instructions IA" },
] as const;

export function SettingsLayout() {
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (location.pathname === "/settings" || location.pathname === "/settings/") {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div className="atelier-paper min-h-screen px-6 py-10 text-[var(--color-ink)]">
      <div className="mx-auto w-full max-w-[58rem]">
        <header className="mb-12">
          <NavLink
            to="/editor"
            className="font-mono-caps text-[10px] text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
          >
            ← Éditeur
          </NavLink>
          <h1 className="mt-3 font-display text-[44px] leading-[0.95] tracking-[-0.03em]">
            Paramètres
          </h1>
        </header>

        <div className="grid gap-12 md:grid-cols-[160px_1fr]">
          <nav aria-label="Sections" className="space-y-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "group flex items-baseline gap-3 border-l py-2 pl-3 text-[13px] transition",
                    isActive
                      ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                      : "border-transparent text-[var(--color-ink-soft)] hover:border-[var(--color-rule)] hover:text-[var(--color-ink)]",
                  )
                }
                end
              >
                <span className="font-mono-caps text-[10px] tabular-nums opacity-60 group-hover:opacity-100">
                  {tab.index}
                </span>
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
