import { cvDataSchema, type CvData, type TemplateId } from "@cvie/shared";
import type {
  AnonExport,
  CvLibraryRecord,
  CvStore,
  Folder,
  ImportResult,
  SyncStatus,
} from "./types";
import { CvStoreError } from "./types";

const ANON_LIBRARY_KEY = "cvie.cv.library.v1";
const ANON_DRAFT_PREFIX = "cvie.cv.draft.";

function libraryKey(namespace: string): string {
  return namespace === "anon"
    ? ANON_LIBRARY_KEY
    : `cvie.user.${namespace}.cv.library.v1`;
}
function draftKey(namespace: string, cvId: string): string {
  return namespace === "anon"
    ? `${ANON_DRAFT_PREFIX}${cvId}`
    : `cvie.user.${namespace}.cv.draft.${cvId}`;
}

const SEEDED_DEMO_IDS = new Set([
  "cv-product-lead",
  "cv-data-storytelling",
  "cv-ux-strategy",
]);

const DEFAULT_LIBRARY = (): CvLibraryRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: "cv-main",
      title: "Mon CV",
      templateId: "classique",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

function defaultStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is CvLibraryRecord {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.templateId === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

type Listener = (s: SyncStatus) => void;

export type LocalCvStoreOptions = {
  /**
   * "anon" uses the legacy keys (`cvie.cv.library.v1` etc.) so existing
   * users' data is preserved across the refactor. Any other value (e.g.
   * `user-<auth0Sub>`) namespaces the keys under that identity.
   */
  namespace: string;
  /** Optional override — handy in tests where window.localStorage is partial. */
  storage?: Storage | null;
};

export class LocalCvStore implements CvStore {
  private readonly listeners = new Set<Listener>();
  private readonly storage: Storage | null;
  constructor(private readonly opts: LocalCvStoreOptions) {
    this.storage = opts.storage !== undefined ? opts.storage : defaultStorage();
  }

  private emit(status: SyncStatus): void {
    for (const cb of this.listeners) cb(status);
  }

  subscribeStatus(cb: Listener): () => void {
    this.listeners.add(cb);
    cb("idle");
    return () => {
      this.listeners.delete(cb);
    };
  }

  async listFolders(): Promise<Folder[]> {
    return [];
  }
  async createFolder(_name: string): Promise<Folder> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }
  async renameFolder(_id: string, _name: string): Promise<Folder> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }
  async deleteFolder(_id: string, _moveCvsTo: string): Promise<void> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folders require a signed-in account.",
    );
  }

  private readLibrary(): CvLibraryRecord[] {
    const storage = this.storage;
    if (!storage) return DEFAULT_LIBRARY();
    try {
      const raw = storage.getItem(libraryKey(this.opts.namespace));
      if (!raw) {
        const def = DEFAULT_LIBRARY();
        this.writeLibrary(def);
        return def;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_LIBRARY();
      const valid = parsed.filter(isRecord);
      if (valid.length === 0) return DEFAULT_LIBRARY();
      const onlySeededDemo =
        valid.length === SEEDED_DEMO_IDS.size &&
        valid.every((r) => SEEDED_DEMO_IDS.has(r.id));
      if (onlySeededDemo) {
        const migrated = DEFAULT_LIBRARY();
        this.writeLibrary(migrated);
        return migrated;
      }
      return [...valid].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch {
      return DEFAULT_LIBRARY();
    }
  }

  private writeLibrary(records: CvLibraryRecord[]): void {
    const storage = this.storage;
    if (!storage) return;
    try {
      storage.setItem(
        libraryKey(this.opts.namespace),
        JSON.stringify(records),
      );
    } catch {
      // ignore quota errors
    }
  }

  async listActive(): Promise<CvLibraryRecord[]> {
    return this.readLibrary();
  }

  async listTrash(): Promise<CvLibraryRecord[]> {
    return [];
  }

  async read(id: string): Promise<CvData | null> {
    const storage = this.storage;
    if (!storage) return null;
    const raw = storage.getItem(draftKey(this.opts.namespace, id));
    if (!raw) return null;
    try {
      const parsed = cvDataSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async create(
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ): Promise<CvLibraryRecord> {
    const id = `cv-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: CvLibraryRecord = {
      id,
      title: record.title.trim() || "Nouveau CV",
      templateId: record.templateId,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    };
    const lib = [newRec, ...this.readLibrary()];
    this.writeLibrary(lib);
    await this.patch(id, { data: body });
    return newRec;
  }

  async patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord> {
    this.emit("saving");
    const storage = this.storage;
    const lib = this.readLibrary();
    const idx = lib.findIndex((r) => r.id === id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      const cur = lib[idx]!;
      const next: CvLibraryRecord = {
        ...cur,
        title: partial.title?.trim() || cur.title,
        templateId: partial.templateId ?? cur.templateId,
        updatedAt: now,
      };
      lib[idx] = next;
      this.writeLibrary(lib);
    }
    if (partial.data !== undefined && storage) {
      const parsed = cvDataSchema.safeParse(partial.data);
      if (!parsed.success) {
        this.emit("error");
        throw new CvStoreError("VALIDATION", "CV body failed schema check.");
      }
      try {
        storage.setItem(
          draftKey(this.opts.namespace, id),
          JSON.stringify(parsed.data),
        );
      } catch {
        this.emit("error");
        throw new CvStoreError("INTERNAL", "Failed to write to localStorage.");
      }
    }
    const after = this.readLibrary().find((r) => r.id === id) ?? {
      id,
      title: partial.title ?? "",
      templateId: partial.templateId ?? "classique",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.emit("saved");
    return after;
  }

  async moveCv(_id: string, _folderId: string): Promise<void> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Folder moves require a signed-in account.",
    );
  }

  async hardDeleteCv(id: string): Promise<void> {
    const storage = this.storage;
    if (!storage) return;
    const lib = this.readLibrary().filter((r) => r.id !== id);
    this.writeLibrary(lib);
    storage.removeItem(draftKey(this.opts.namespace, id));
  }

  async bulkImport(_records: AnonExport[]): Promise<ImportResult> {
    throw new CvStoreError(
      "NOT_SUPPORTED",
      "Bulk import requires a signed-in account.",
    );
  }
}
