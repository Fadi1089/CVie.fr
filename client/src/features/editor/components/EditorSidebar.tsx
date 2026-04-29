import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { templateRegistry, type TemplateId } from "@cvie/shared";
import { cn } from "@/lib/utils";
import { AuthGate, LoginButton, UserMenu } from "@/features/auth";
import {
  createCvRecord,
  formatUpdatedAt,
  readCvLibrary,
  type CvLibraryRecord,
} from "@/features/cv-library/storage";

const TEMPLATE_SELECTION_KEY = "cvie.template.selected";
const SIDEBAR_COLLAPSED_KEY = "cvie.editor.sidebar.collapsed";

type EditorSidebarProps = {
  activeCvId: string;
  activeTemplateId: TemplateId;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  onCvCreated?: (cv: CvLibraryRecord) => void;
};

export function EditorSidebar({
  activeCvId,
  activeTemplateId,
  collapsed,
  onCollapsedChange,
  onCvCreated,
}: EditorSidebarProps) {
  const navigate = useNavigate();
  const [library, setLibrary] = useState<CvLibraryRecord[]>(() => readCvLibrary());

  // Resync when active record changes (covers rename / template swap from editor).
  useEffect(() => {
    setLibrary(readCvLibrary());
  }, [activeCvId, activeTemplateId]);

  // Reflect cross-tab edits without forcing a hard reload.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === "cvie.cv.library.v1") {
        setLibrary(readCvLibrary());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleOpen = useCallback(
    (cv: CvLibraryRecord) => {
      try {
        window.localStorage.setItem(TEMPLATE_SELECTION_KEY, cv.templateId);
      } catch {
        // ignore storage access issues
      }
      navigate(`/editor?template=${cv.templateId}&cv=${encodeURIComponent(cv.id)}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(() => {
    const templateId = activeTemplateId ?? "classique";
    const newCv = createCvRecord(templateId);
    setLibrary(readCvLibrary());
    onCvCreated?.(newCv);
    try {
      window.localStorage.setItem(TEMPLATE_SELECTION_KEY, templateId);
    } catch {
      // ignore storage access issues
    }
    navigate(
      `/editor?template=${templateId}&cv=${encodeURIComponent(newCv.id)}&new=1`,
    );
  }, [activeTemplateId, navigate, onCvCreated]);

  const items = useMemo(() => {
    return library.map((cv, index) => {
      const templateName =
        templateRegistry.find((t) => t.id === cv.templateId)?.name ?? "Classique";
      return { cv, index, templateName };
    });
  }, [library]);

  return (
    <aside
      className={cn(
        "editor-sidebar group/sidebar relative hidden shrink-0 md:flex",
        "h-[100vh] flex-col overflow-hidden border-r border-[var(--color-rule)]",
        "bg-[var(--color-paper)]/85 backdrop-blur-md",
        collapsed ? "w-[64px]" : "w-[272px]",
      )}
      aria-label="Bibliotheque CV"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className="editor-sidebar__seam" aria-hidden="true" />

      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-[var(--color-rule)]/80",
          collapsed ? "h-16 justify-center px-0" : "h-16 px-5",
        )}
      >
        <div className="editor-sidebar__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M5 4h10l4 4v12H5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M15 4v4h4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M8 12h8M8 15.5h6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-display text-[18px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
              CVie<span className="text-[var(--color-gold)]">.</span>fr
            </p>
            <p className="font-mono-caps mt-1 text-[9px] tracking-[0.18em] text-[var(--color-ink-soft)]">
              Bibliotheque
            </p>
          </div>
        ) : null}
      </div>

      {/* Create */}
      <div className={cn("p-3", collapsed && "px-2")}>
        <button
          type="button"
          onClick={handleCreate}
          className={cn(
            "editor-sidebar__create group/create relative flex items-center gap-2 overflow-hidden rounded-full border border-[var(--color-rule)] bg-white/82 text-[13px] font-medium text-[var(--color-ink)] transition motion-reduce:transition-none",
            "hover:border-[var(--color-ink-soft)]/50 hover:bg-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
            collapsed
              ? "h-10 w-10 justify-center p-0"
              : "h-10 w-full justify-center px-4",
          )}
          aria-label="Creer un nouveau CV"
          title="Creer un nouveau CV"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed ? <span>Nouveau CV</span> : null}
        </button>
      </div>

      {/* List */}
      <nav
        className={cn(
          "editor-sidebar__list min-h-0 flex-1 overflow-y-auto",
          collapsed ? "px-1.5 py-1" : "px-2 py-1",
        )}
        aria-label="Liste des CV"
      >
        {!collapsed ? (
          <p className="font-mono-caps mb-1 px-3 pt-1 text-[9px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            CVs
          </p>
        ) : null}
        <ul className="flex flex-col gap-0.5">
          {items.map(({ cv, index, templateName }) => {
            const isActive = cv.id === activeCvId;
            return (
              <li key={cv.id}>
                <button
                  type="button"
                  onClick={() => handleOpen(cv)}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? cv.title : undefined}
                  className={cn(
                    "editor-sidebar__item group/item relative flex w-full items-center gap-3 overflow-hidden rounded-lg text-left transition-colors motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
                    collapsed
                      ? "h-11 justify-center px-2"
                      : "px-3 py-2.5",
                    isActive
                      ? "bg-[var(--color-paper-deep)]/85 text-[var(--color-ink)]"
                      : "text-[var(--color-ink)] hover:bg-white/60",
                  )}
                >
                  {isActive ? (
                    <span
                      className="editor-sidebar__active-rail"
                      aria-hidden="true"
                    />
                  ) : null}

                  {collapsed ? (
                    <span className="font-mono-caps text-[10px] tabular-nums text-[var(--color-ink-soft)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  ) : (
                    <>
                      <span className="font-mono-caps w-7 shrink-0 text-[10px] tabular-nums text-[var(--color-ink-soft)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display block truncate text-[15px] leading-tight tracking-[-0.01em]">
                          {cv.title}
                        </span>
                        <span className="mt-0.5 flex items-baseline gap-1.5 text-[11px] text-[var(--color-ink-soft)]">
                          <span className="truncate">{templateName}</span>
                          <span aria-hidden="true" className="text-[var(--color-dot)]">·</span>
                          <span className="truncate">
                            {formatUpdatedAt(cv.updatedAt).replace(
                              /^Mis a jour /,
                              "",
                            )}
                          </span>
                        </span>
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Auth slot */}
      <div
        className={cn(
          "border-t border-[var(--color-rule)]/80",
          collapsed ? "px-2 py-2" : "px-3 py-3",
        )}
      >
        {!collapsed ? (
          <AuthGate anon={<LoginButton />} authed={<UserMenu />} />
        ) : null}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-[var(--color-rule)]/80",
          collapsed ? "px-2 py-2" : "px-3 py-2.5",
        )}
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Deplier la barre laterale" : "Replier la barre laterale"}
          aria-pressed={collapsed}
          title={collapsed ? "Deplier" : "Replier"}
          className={cn(
            "inline-flex items-center gap-2 rounded-md text-[12px] text-[var(--color-ink-soft)] transition-colors",
            "hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
            collapsed ? "h-9 w-full justify-center" : "h-9 px-2",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="font-mono-caps text-[10px] tracking-[0.18em]">
                Replier
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const update = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // ignore storage access issues
    }
  }, []);

  return [collapsed, update] as const;
}
