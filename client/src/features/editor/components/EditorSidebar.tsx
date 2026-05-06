import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { ChevronLeft, FileText, Plus, Trash2 } from "lucide-react";
import { createEmptyCv, templateRegistry, type TemplateId } from "@cvie/shared";
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

function CvNameModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("Nouveau CV");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const name = value.trim().slice(0, 200) || "Nouveau CV";
    onConfirm(name);
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nom du nouveau CV"
        className="fixed left-1/2 top-1/3 z-50 w-72 -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-rule)",
          borderRadius: "1rem",
          boxShadow: "0 8px 40px -8px rgba(10,10,10,0.18), 0 2px 8px -2px rgba(10,10,10,0.08)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <p
          className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]"
        >
          NOUVEAU CV
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) submit();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full rounded-lg border border-[var(--color-rule)] bg-white/60 px-3 py-2 font-display text-[16px] tracking-[-0.01em] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink-soft)]/50 focus:ring-2 focus:ring-[var(--color-ink)]/10"
          maxLength={200}
          autoComplete="off"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-mono-caps rounded-full px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
          >
            ANNULER
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[var(--color-ink)]/85 disabled:opacity-40"
          >
            Créer
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function folderAccent(folder: Folder): string {
  if (folder.isSystem && folder.ttlDays === null) return "#206aab";
  if (folder.isSystem && folder.ttlDays !== null) return "#b33d3b";
  // djb2 hash of id → hue, with yellow-green band (60-130) skipped to
  // avoid clashing with the warm cream paper background. Saturation /
  // lightness are pinned so every accent reads at the same visual
  // weight as the pre-defined system colors.
  let hash = 5381;
  for (const c of folder.id) hash = ((hash << 5) + hash + c.charCodeAt(0)) | 0;
  const allowed = 360 - 70;
  let hue = Math.abs(hash) % allowed;
  if (hue >= 60) hue += 70;
  return `hsl(${hue} 48% 41%)`;
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
  const createCvWithName = async (title: string) => {
    const templateId = activeTemplateId ?? "classique";
    setCvNameModalOpen(false);
    try {
      const created = await lib.createCv(
        { title, templateId },
        createEmptyCv(),
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
      toast.push("Impossible de créer le CV", { variant: "error" });
    }
  };
  const onCreateCv = () => setCvNameModalOpen(true);
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
  const [replierSpin, setReplierSpin] = useState(collapsed ? 180 : 0);
  const [cvNameModalOpen, setCvNameModalOpen] = useState(false);

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

      <div className="relative h-16 border-b border-[var(--color-rule)]/80">
        <div
          className="editor-sidebar__mark absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 9H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 13H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 17H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <svg
            className="editor-sidebar__gemini absolute -right-1 -top-1"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path
              d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12 6.6 0 12-5.4 12-12z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div
          className={cn(
            "absolute left-[60px] right-3 top-1/2 -translate-y-1/2 truncate",
            "transition-opacity duration-[180ms]",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          <p className="font-display text-[18px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            CVie<span className="text-[var(--color-gold)]">.</span>fr
          </p>
          <p className="font-mono-caps mt-1 text-[9px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            Bibliotheque
          </p>
        </div>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onCreateCv}
          className={cn(
            "editor-sidebar__create relative h-10 w-full overflow-hidden rounded-full border border-[var(--color-rule)] bg-white/82 text-[13px] font-medium text-[var(--color-ink)] transition-colors motion-reduce:transition-none",
            "hover:border-[var(--color-ink-soft)]/50 hover:bg-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
          )}
          aria-label="Creer un nouveau CV"
          title="Creer un nouveau CV"
        >
          <Plus
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <span
            className={cn(
              "absolute left-9 right-3 top-1/2 -translate-y-1/2 truncate text-left",
              "transition-opacity duration-[180ms]",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          >
            Nouveau CV
          </span>
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
                accentColor={folderAccent(folder)}
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
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                  collapsed || isCollapsed || cvs.length === 0
                    ? "grid-rows-[0fr]"
                    : "grid-rows-[1fr]",
                )}
                aria-hidden={collapsed || isCollapsed ? "true" : undefined}
              >
                <ul
                  className={cn(
                    "flex flex-col gap-0.5 overflow-hidden",
                    "transition-opacity duration-[200ms]",
                    collapsed || isCollapsed ? "opacity-0" : "opacity-100",
                  )}
                >
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
              </div>
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
                  if (e.key === "Enter" && folderDraft.trim().length > 0)
                    void submitNewFolder();
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

      <div className="relative h-14 border-t border-[var(--color-rule)]/80">
        <AuthGate
          anon={<LoginButton compact={collapsed} />}
          authed={<UserMenu compact={collapsed} />}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setReplierSpin((s) => s + 180);
          onCollapsedChange(!collapsed);
        }}
        aria-label={collapsed ? "Deplier la barre laterale" : "Replier la barre laterale"}
        aria-pressed={collapsed}
        title={collapsed ? "Deplier" : "Replier"}
        className={cn(
          "relative h-14 w-full border-t border-[var(--color-rule)]/80 text-[12px] text-[var(--color-ink-soft)] transition-colors",
          "hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
        )}
      >
        <ChevronLeft
          aria-hidden
          className="absolute left-6 h-4 w-4 transition-transform duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            top: "50%",
            transform: `translateY(-50%) rotate(${replierSpin}deg)`,
          }}
        />
        <span
          className={cn(
            "font-mono-caps absolute left-[60px] right-3 top-1/2 -translate-y-1/2 truncate text-left text-[10px] tracking-[0.18em]",
            "transition-opacity duration-[180ms]",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          Replier
        </span>
      </button>

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

      {cvNameModalOpen ? (
        <CvNameModal
          onConfirm={(name) => void createCvWithName(name)}
          onCancel={() => setCvNameModalOpen(false)}
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
  const [replierSpin, setReplierSpin] = useState(collapsed ? 180 : 0);
  const [cvNameModalOpen, setCvNameModalOpen] = useState(false);

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

  const createCvWithName = useCallback(
    (title: string) => {
      const templateId = activeTemplateId ?? "classique";
      setCvNameModalOpen(false);
      const newCv = createCvRecord(templateId, title);
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
    },
    [activeTemplateId, navigate, onCvCreated],
  );
  const handleCreate = useCallback(
    () => setCvNameModalOpen(true),
    [],
  );

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

      <div className="relative h-16 border-b border-[var(--color-rule)]/80">
        <div
          className="editor-sidebar__mark absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 9H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 13H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 17H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <svg
            className="editor-sidebar__gemini absolute -right-1 -top-1"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path
              d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12 6.6 0 12-5.4 12-12z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div
          className={cn(
            "absolute left-[60px] right-3 top-1/2 -translate-y-1/2 truncate",
            "transition-opacity duration-[180ms]",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          <p className="font-display text-[18px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            CVie<span className="text-[var(--color-gold)]">.</span>fr
          </p>
          <p className="font-mono-caps mt-1 text-[9px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            Bibliotheque
          </p>
        </div>
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
          {collapsed ? (
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <>
              <Plus className="absolute left-4 h-4 w-4" aria-hidden />
              <span>Nouveau CV</span>
            </>
          )}
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

      <div className="relative h-14 border-t border-[var(--color-rule)]/80">
        <AuthGate
          anon={<LoginButton compact={collapsed} />}
          authed={<UserMenu compact={collapsed} />}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setReplierSpin((s) => s + 180);
          onCollapsedChange(!collapsed);
        }}
        aria-label={collapsed ? "Deplier la barre laterale" : "Replier la barre laterale"}
        aria-pressed={collapsed}
        title={collapsed ? "Deplier" : "Replier"}
        className={cn(
          "relative h-14 w-full border-t border-[var(--color-rule)]/80 text-[12px] text-[var(--color-ink-soft)] transition-colors",
          "hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/25",
        )}
      >
        <ChevronLeft
          aria-hidden
          className="absolute left-6 h-4 w-4 transition-transform duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            top: "50%",
            transform: `translateY(-50%) rotate(${replierSpin}deg)`,
          }}
        />
        <span
          className={cn(
            "font-mono-caps absolute left-[60px] right-3 top-1/2 -translate-y-1/2 truncate text-left text-[10px] tracking-[0.18em]",
            "transition-opacity duration-[180ms]",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          Replier
        </span>
      </button>

      {cvNameModalOpen ? (
        <CvNameModal
          onConfirm={(name) => createCvWithName(name)}
          onCancel={() => setCvNameModalOpen(false)}
        />
      ) : null}
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
