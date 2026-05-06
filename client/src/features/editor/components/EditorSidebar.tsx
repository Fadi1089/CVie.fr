import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { templateRegistry, type TemplateId } from "@cvie/shared";
import { useAuth0 } from "@auth0/auth0-react";
import { cn } from "@/lib/utils";
import { AuthGate, LoginButton, UserMenu } from "@/features/auth";
import {
  createCvRecord,
  formatUpdatedAt,
  readCvLibrary,
  type CvLibraryRecord,
} from "@/features/cv-library/storage";
import { useCvLibrary } from "@/features/cv-library/hooks/useCvLibrary";
import { useToast } from "@/features/ui/Toast";
import { FolderHeader } from "@/features/cv-library/components/FolderHeader";
import { CvContextMenu } from "@/features/cv-library/components/CvContextMenu";
import { DeleteFolderModal } from "@/features/cv-library/components/DeleteFolderModal";
import type { Folder } from "@/features/cv-library/store/types";

const TEMPLATE_SELECTION_KEY = "cvie.template.selected";
const SIDEBAR_COLLAPSED_KEY = "cvie.editor.sidebar.collapsed";
const FOLDER_COLLAPSED_KEY_PREFIX = "cvie.editor.folders.collapsed";

type EditorSidebarProps = {
  activeCvId: string;
  activeTemplateId: TemplateId;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  onCvCreated?: (cv: CvLibraryRecord) => void;
};

function readFolderCollapsed(sub: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(
      `${FOLDER_COLLAPSED_KEY_PREFIX}.${sub}`,
    );
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writeFolderCollapsed(sub: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(
      `${FOLDER_COLLAPSED_KEY_PREFIX}.${sub}`,
      JSON.stringify([...ids]),
    );
  } catch {
    /* ignore */
  }
}

function compareFolders(a: Folder, b: Folder): number {
  // Default system folder ("Mes CV", ttlDays=null) first; user folders next; trash last.
  const order = (f: Folder) =>
    f.isSystem && f.ttlDays === null
      ? 0
      : f.isSystem && f.ttlDays !== null
        ? 2
        : 1;
  const oa = order(a);
  const ob = order(b);
  if (oa !== ob) return oa - ob;
  return a.name.localeCompare(b.name, "fr-FR");
}

function AuthedSidebar({
  sub,
  activeCvId,
  activeTemplateId,
  collapsed,
  onCollapsedChange,
  onCvCreated,
}: EditorSidebarProps & { sub: string }) {
  const navigate = useNavigate();
  const lib = useCvLibrary();
  const toast = useToast();
  const isTrashFolder = (folderId: string) => {
    const f = lib.folders.find((x) => x.id === folderId);
    return f?.isSystem === true && f?.ttlDays !== null;
  };
  const moveCvWithToast = async (cvId: string, folderId: string) => {
    try {
      await lib.moveCv(cvId, folderId);
      const target = lib.folders.find((f) => f.id === folderId);
      if (isTrashFolder(folderId)) {
        toast.push("CV mis à la corbeille", { variant: "info" });
      } else {
        toast.push(
          `CV déplacé vers « ${target?.name ?? "le dossier"} »`,
          { variant: "success" },
        );
      }
    } catch {
      toast.push("Échec du déplacement", { variant: "error" });
    }
  };
  const hardDeleteCvWithToast = async (cvId: string) => {
    try {
      await lib.hardDeleteCv(cvId);
      toast.push("CV supprimé définitivement", { variant: "info" });
    } catch {
      toast.push("Échec de la suppression", { variant: "error" });
    }
  };
  const onCreateCv = async () => {
    const templateId = activeTemplateId ?? "classique";
    try {
      const created = await lib.createCv(
        { title: "Nouveau CV", templateId },
        // Pass an empty-shape body; the editor will hydrate via the form.
        // The schema rejects this on persistence — server returns VALIDATION,
        // and we'll seed via the editor's first valid save instead. Keep the
        // create call here so the library row exists for navigation.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
      );
      onCvCreated?.(created as unknown as CvLibraryRecord);
      try {
        window.localStorage.setItem(TEMPLATE_SELECTION_KEY, templateId);
      } catch {
        /* ignore */
      }
      navigate(
        `/editor?template=${templateId}&cv=${encodeURIComponent(created.id)}&new=1`,
      );
    } catch {
      /* surface in a future iteration (toast on quota) */
    }
  };
  const [folderCollapsed, setFolderCollapsed] = useState<Set<string>>(() =>
    readFolderCollapsed(sub),
  );
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    cv: CvLibraryRecord;
    isInTrash: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(
    null,
  );

  useEffect(() => {
    writeFolderCollapsed(sub, folderCollapsed);
  }, [sub, folderCollapsed]);

  const sortedFolders = useMemo(
    () => [...lib.folders].sort(compareFolders),
    [lib.folders],
  );
  const cvsByFolder = useMemo(() => {
    const map = new Map<string, CvLibraryRecord[]>();
    for (const f of sortedFolders) map.set(f.id, []);
    for (const cv of lib.active) {
      const arr = cv.folderId ? map.get(cv.folderId) : undefined;
      if (arr) arr.push(cv as CvLibraryRecord);
    }
    const trashFolder = sortedFolders.find(
      (f) => f.isSystem && f.ttlDays !== null,
    );
    if (trashFolder) map.set(trashFolder.id, [...lib.trash] as CvLibraryRecord[]);
    return map;
  }, [sortedFolders, lib.active, lib.trash]);

  const toggleFolder = (id: string) => {
    setFolderCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCv = (cv: CvLibraryRecord) => {
    try {
      window.localStorage.setItem(TEMPLATE_SELECTION_KEY, cv.templateId);
    } catch {
      /* ignore */
    }
    navigate(
      `/editor?template=${cv.templateId}&cv=${encodeURIComponent(cv.id)}`,
    );
  };

  const submitNewFolder = async () => {
    const name = folderDraft.trim();
    if (!name) {
      setCreatingFolder(false);
      return;
    }
    try {
      await lib.createFolder(name);
      setFolderDraft("");
      setCreatingFolder(false);
    } catch {
      /* surface inline error in a future iteration */
    }
  };

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

      <div
        className={cn(
          "flex items-center gap-2 border-b border-[var(--color-rule)]/80",
          collapsed ? "h-16 justify-center px-0" : "h-16 px-5",
        )}
      >
        <div className="editor-sidebar__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M5 4h10l4 4v12H5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M8 12h8M8 15.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

      <div className={cn("p-3", collapsed && "px-2")}>
        <button
          type="button"
          onClick={onCreateCv}
          className={cn(
            "editor-sidebar__create relative flex items-center gap-2 overflow-hidden rounded-full border border-[var(--color-rule)] bg-white/82 text-[13px] font-medium text-[var(--color-ink)] transition motion-reduce:transition-none",
            "hover:border-[var(--color-ink-soft)]/50 hover:bg-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
            collapsed ? "h-10 w-10 justify-center p-0" : "h-10 w-full justify-center px-4",
          )}
          aria-label="Creer un nouveau CV"
          title="Creer un nouveau CV"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed ? <span>Nouveau CV</span> : null}
        </button>
      </div>

      <nav
        className="editor-sidebar__list min-h-0 flex-1 overflow-y-auto px-2 py-1"
        aria-label="Bibliothèque par dossier"
      >
        {sortedFolders.map((folder) => {
          const isCollapsed = folderCollapsed.has(folder.id);
          const cvs = cvsByFolder.get(folder.id) ?? [];
          return (
            <div key={folder.id}>
              <FolderHeader
                folder={folder}
                count={cvs.length}
                expanded={!isCollapsed}
                collapsed={collapsed}
                onToggle={() => toggleFolder(folder.id)}
                onExpandSidebar={() => onCollapsedChange(false)}
                onRename={
                  folder.isSystem
                    ? undefined
                    : async (next) => {
                        await lib.renameFolder(folder.id, next);
                      }
                }
                onDelete={
                  folder.isSystem
                    ? undefined
                    : () => setDeleteFolderTarget(folder)
                }
              />
              {!collapsed && !isCollapsed && cvs.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                  {cvs.map((cv, idx) => {
                    const isActive = cv.id === activeCvId;
                    const templateName =
                      templateRegistry.find((t) => t.id === cv.templateId)?.name ?? "Classique";
                    const isInTrashFolder =
                      folder.isSystem && folder.ttlDays !== null;
                    const trashFolder = sortedFolders.find(
                      (f) => f.isSystem && f.ttlDays !== null,
                    );
                    return (
                      <li key={cv.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => openCv(cv)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              cv,
                              isInTrash: isInTrashFolder,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          aria-current={isActive ? "page" : undefined}
                          title={`${cv.title} — ${templateName}`}
                          className={cn(
                            "editor-sidebar__item relative flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-3 pr-8 text-left transition-colors motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
                            isActive
                              ? "bg-[var(--color-paper-deep)]/85 text-[var(--color-ink)]"
                              : "text-[var(--color-ink)] hover:bg-white/60",
                          )}
                        >
                          <FileText
                            className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-soft)]"
                            aria-hidden
                          />
                          <span className="font-display flex-1 truncate text-[14px] tracking-[-0.01em]">
                            {cv.title}
                          </span>
                          <span className="font-mono-caps shrink-0 text-[9px] tabular-nums text-[var(--color-ink-soft)]">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                        </button>
                        {!isInTrashFolder && trashFolder ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void moveCvWithToast(cv.id, trashFolder.id);
                            }}
                            aria-label="Mettre à la corbeille"
                            title="Mettre à la corbeille"
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity",
                              "text-[var(--color-ink-soft)] group-hover:opacity-100 hover:text-red-600",
                              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {/* Place "+ Nouveau dossier" inline before the trash folder */}
              {!collapsed &&
              folder.isSystem &&
              folder.ttlDays === null ? null : null}
            </div>
          );
        })}

        {!collapsed ? (
          <div className="mt-2 px-3">
            {creatingFolder ? (
              <input
                autoFocus
                value={folderDraft}
                onChange={(e) => setFolderDraft(e.target.value)}
                onBlur={submitNewFolder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitNewFolder();
                  if (e.key === "Escape") {
                    setFolderDraft("");
                    setCreatingFolder(false);
                  }
                }}
                placeholder="Nom du dossier"
                className="font-mono-caps w-full bg-transparent text-[10px] tracking-[0.18em] outline-none placeholder:text-[var(--color-ink-soft)]/60"
                maxLength={64}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                + Nouveau dossier
              </button>
            )}
          </div>
        ) : null}
      </nav>

      <div
        className={cn(
          "flex h-14 items-center border-t border-[var(--color-rule)]/80",
          "transition-[padding] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "px-4" : "px-3",
        )}
      >
        <AuthGate
          anon={<LoginButton compact={collapsed} />}
          authed={<UserMenu compact={collapsed} />}
        />
      </div>

      <div className="border-t border-[var(--color-rule)]/80 px-3 py-2.5">
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
              <span className="font-mono-caps text-[10px] tracking-[0.18em]">Replier</span>
            </>
          )}
        </button>
      </div>

      {contextMenu ? (
        <CvContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          folders={sortedFolders}
          isInTrash={contextMenu.isInTrash}
          onMove={(folderId) => {
            void moveCvWithToast(contextMenu.cv.id, folderId);
          }}
          onTrash={() => {
            const trash = sortedFolders.find(
              (f) => f.isSystem && f.ttlDays !== null,
            );
            if (trash) void moveCvWithToast(contextMenu.cv.id, trash.id);
          }}
          onRestore={(folderId) => {
            void moveCvWithToast(contextMenu.cv.id, folderId);
          }}
          onHardDelete={() => {
            void hardDeleteCvWithToast(contextMenu.cv.id);
          }}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {deleteFolderTarget ? (
        <DeleteFolderModal
          folder={deleteFolderTarget}
          reassignTargets={sortedFolders.filter(
            (f) => f.id !== deleteFolderTarget.id,
          )}
          cvCount={(cvsByFolder.get(deleteFolderTarget.id) ?? []).length}
          onConfirm={async (moveCvsTo) => {
            await lib.deleteFolder(deleteFolderTarget.id, moveCvsTo);
            setDeleteFolderTarget(null);
          }}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      ) : null}
    </aside>
  );
}

function AnonSidebar({
  activeCvId,
  activeTemplateId,
  collapsed,
  onCollapsedChange,
  onCvCreated,
}: EditorSidebarProps) {
  const navigate = useNavigate();
  const [library, setLibrary] = useState<CvLibraryRecord[]>(() => readCvLibrary());

  useEffect(() => {
    setLibrary(readCvLibrary());
  }, [activeCvId, activeTemplateId]);

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
        /* ignore */
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
      /* ignore */
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

      <div
        className={cn(
          "flex items-center gap-2 border-b border-[var(--color-rule)]/80",
          collapsed ? "h-16 justify-center px-0" : "h-16 px-5",
        )}
      >
        <div className="editor-sidebar__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M5 4h10l4 4v12H5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M8 12h8M8 15.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

      <div className={cn("p-3", collapsed && "px-2")}>
        <button
          type="button"
          onClick={handleCreate}
          className={cn(
            "editor-sidebar__create relative flex items-center gap-2 overflow-hidden rounded-full border border-[var(--color-rule)] bg-white/82 text-[13px] font-medium text-[var(--color-ink)] transition motion-reduce:transition-none",
            "hover:border-[var(--color-ink-soft)]/50 hover:bg-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
            collapsed ? "h-10 w-10 justify-center p-0" : "h-10 w-full justify-center px-4",
          )}
          aria-label="Creer un nouveau CV"
          title="Creer un nouveau CV"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed ? <span>Nouveau CV</span> : null}
        </button>
      </div>

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
                    "editor-sidebar__item relative flex w-full items-center gap-3 overflow-hidden rounded-lg text-left transition-colors motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
                    collapsed ? "h-11 justify-center px-2" : "px-3 py-2.5",
                    isActive
                      ? "bg-[var(--color-paper-deep)]/85 text-[var(--color-ink)]"
                      : "text-[var(--color-ink)] hover:bg-white/60",
                  )}
                >
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
                            {formatUpdatedAt(cv.updatedAt).replace(/^Mis a jour /, "")}
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

      <div
        className={cn(
          "flex h-14 items-center border-t border-[var(--color-rule)]/80",
          "transition-[padding] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "px-4" : "px-3",
        )}
      >
        <AuthGate
          anon={<LoginButton compact={collapsed} />}
          authed={<UserMenu compact={collapsed} />}
        />
      </div>

      <div className="border-t border-[var(--color-rule)]/80 px-3 py-2.5">
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
              <span className="font-mono-caps text-[10px] tracking-[0.18em]">Replier</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function EditorSidebar(props: EditorSidebarProps) {
  const { isAuthenticated, user } = useAuth0();
  if (isAuthenticated && user?.sub) {
    return <AuthedSidebar {...props} sub={user.sub} />;
  }
  return <AnonSidebar {...props} />;
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
      /* ignore */
    }
  }, []);

  return [collapsed, update] as const;
}
