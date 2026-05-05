import type { CvData, TemplateId } from "@cvie/shared";
import type {
  AnonExport,
  CvLibraryRecord,
  CvStore,
  Folder,
  ImportResult,
  SyncStatus,
} from "./types";
import { CvStoreError } from "./types";
import type { LocalCvStore } from "./LocalCvStore";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type DbCvStoreOptions = {
  /** Identity scope for the localStorage cache. Typically `user-<auth0Sub>`. */
  namespace: string;
  /** Underlying LocalCvStore wrapping the same namespace. */
  local: LocalCvStore;
  /** Auth-injecting fetch (e.g. from `useAuthApi`). Defaults to global `fetch`. */
  fetch?: AuthFetch;
  /** Retry timing — exposed for tests. */
  retry?: { initialMs?: number; maxMs?: number };
};

type Waiter = {
  resolve: (rec: CvLibraryRecord) => void;
  reject: (err: unknown) => void;
};

type Pending = {
  partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>;
  /** All callers awaiting the next successful flush for this id. */
  waiters: Waiter[];
  inflight: boolean;
  attempts: number;
  /** Set when a new patch arrived while `inflight=true`. After the in-flight
   *  request resolves, the merged `partial` is flushed again. */
  dirtyAfterFlight: boolean;
};

const DEFAULT_INITIAL_BACKOFF = 1_000;
const DEFAULT_MAX_BACKOFF = 30_000;

export class DbCvStore implements CvStore {
  private readonly listeners = new Set<(s: SyncStatus) => void>();
  private readonly fetch: AuthFetch;
  private readonly queue = new Map<string, Pending>();
  private status: SyncStatus = "idle";

  constructor(private readonly opts: DbCvStoreOptions) {
    this.fetch = opts.fetch ?? ((input, init) => fetch(input, init));
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.drainQueue();
      });
    }
  }

  private setStatus(s: SyncStatus): void {
    this.status = s;
    for (const cb of this.listeners) cb(s);
  }

  subscribeStatus(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private async request<T>(input: string, init?: RequestInit): Promise<T> {
    const res = await this.fetch(input, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status === 401) {
      const err = new CvStoreError("UNAUTHENTICATED", "Session expirée.");
      (err as CvStoreError & { httpStatus?: number }).httpStatus = 401;
      throw err;
    }
    if (!res.ok) {
      let code = "INTERNAL";
      try {
        const body = (await res.clone().json()) as { code?: string };
        if (body.code) code = body.code;
      } catch {
        /* ignore */
      }
      // Stash the HTTP status so the caller can decide retryability without
      // having to maintain a per-code allowlist.
      const err = new CvStoreError(code as never, `HTTP ${res.status} (${code})`);
      (err as CvStoreError & { httpStatus?: number }).httpStatus = res.status;
      throw err;
    }
    return (await res.json()) as T;
  }

  async listFolders(): Promise<Folder[]> {
    const { folders } = await this.request<{ folders: Folder[] }>(
      "/api/v1/folders",
    );
    return folders;
  }

  async createFolder(name: string): Promise<Folder> {
    const { folder } = await this.request<{ folder: Folder }>(
      "/api/v1/folders",
      { method: "POST", body: JSON.stringify({ name }) },
    );
    return folder;
  }

  async renameFolder(id: string, name: string): Promise<Folder> {
    const { folder } = await this.request<{ folder: Folder }>(
      `/api/v1/folders/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    );
    return folder;
  }

  async deleteFolder(id: string, moveCvsTo: string): Promise<void> {
    await this.request<unknown>(
      `/api/v1/folders/${encodeURIComponent(id)}`,
      { method: "DELETE", body: JSON.stringify({ moveCvsTo }) },
    );
  }

  async listActive(): Promise<CvLibraryRecord[]> {
    type Resp = {
      cvs: Array<{
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      }>;
    };
    const { cvs } = await this.request<Resp>("/api/v1/cv");
    return cvs.map((c) => ({
      id: c.id,
      title: c.title,
      templateId: c.templateId,
      folderId: c.folderId,
      // Server doesn't return createdAt in list view; fall back to updatedAt.
      createdAt: c.updatedAt,
      updatedAt: c.updatedAt,
    }));
  }

  async listTrash(): Promise<CvLibraryRecord[]> {
    type Resp = {
      cvs: Array<{
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      }>;
    };
    const { cvs } = await this.request<Resp>("/api/v1/cv/trash");
    return cvs.map((c) => ({
      id: c.id,
      title: c.title,
      templateId: c.templateId,
      folderId: c.folderId,
      createdAt: c.updatedAt,
      updatedAt: c.updatedAt,
    }));
  }

  async read(id: string): Promise<CvData | null> {
    const cached = await this.opts.local.read(id);
    if (cached) return cached;
    try {
      const { cv } = await this.request<{ cv: { data: CvData } }>(
        `/api/v1/cv/${encodeURIComponent(id)}`,
      );
      // Hydrate local cache for next read
      await this.opts.local.patch(id, { data: cv.data });
      return cv.data;
    } catch (err) {
      if (err instanceof CvStoreError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  }

  async create(
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ): Promise<CvLibraryRecord> {
    const { cv } = await this.request<{
      cv: {
        id: string;
        folderId: string;
        title: string;
        templateId: TemplateId;
        updatedAt: string;
      };
    }>("/api/v1/cv", {
      method: "POST",
      body: JSON.stringify({
        title: record.title,
        templateId: record.templateId,
        folderId: record.folderId,
        data: body,
      }),
    });
    await this.opts.local.patch(cv.id, {
      data: body,
      title: cv.title,
      templateId: cv.templateId,
    });
    return {
      id: cv.id,
      title: cv.title,
      templateId: cv.templateId,
      folderId: cv.folderId,
      createdAt: cv.updatedAt,
      updatedAt: cv.updatedAt,
    };
  }

  async patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord> {
    // Local first (durable cache)
    await this.opts.local.patch(id, partial);

    // Coalesce in queue
    return new Promise<CvLibraryRecord>((resolve, reject) => {
      const existing = this.queue.get(id);
      if (existing) {
        existing.partial = { ...existing.partial, ...partial };
        existing.waiters.push({ resolve, reject });
        if (existing.inflight) {
          // The in-flight request resolves the existing waiters with the
          // server's response; after it returns, we re-flush with the merged
          // partial so the latest data reaches the server.
          existing.dirtyAfterFlight = true;
        }
        return;
      }
      const entry: Pending = {
        partial,
        waiters: [{ resolve, reject }],
        inflight: false,
        attempts: 0,
        dirtyAfterFlight: false,
      };
      this.queue.set(id, entry);
      void this.flush(id);
    });
  }

  private async flush(id: string): Promise<void> {
    const entry = this.queue.get(id);
    if (!entry || entry.inflight) return;
    entry.inflight = true;
    this.setStatus("saving");
    try {
      const { cv } = await this.request<{
        cv: {
          id: string;
          folderId: string;
          title: string;
          templateId: TemplateId;
          updatedAt: string;
        };
      }>(`/api/v1/cv/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(entry.partial),
      });
      const rec: CvLibraryRecord = {
        id: cv.id,
        title: cv.title,
        templateId: cv.templateId,
        folderId: cv.folderId,
        createdAt: cv.updatedAt,
        updatedAt: cv.updatedAt,
      };
      // Resolve all waiters that arrived before/during this in-flight call.
      const waiters = entry.waiters;
      entry.waiters = [];
      for (const w of waiters) w.resolve(rec);
      if (entry.dirtyAfterFlight) {
        // A new patch arrived while we were in flight. Re-flush the merged
        // partial so the latest state reaches the server.
        entry.inflight = false;
        entry.dirtyAfterFlight = false;
        entry.attempts = 0;
        this.setStatus("saved");
        void this.flush(id);
      } else {
        this.queue.delete(id);
        this.setStatus("saved");
      }
    } catch (err) {
      entry.inflight = false;
      entry.attempts += 1;
      const httpStatus =
        err instanceof CvStoreError
          ? (err as CvStoreError & { httpStatus?: number }).httpStatus
          : undefined;

      // Auto-promote: a 404 on PATCH means this id has no DB row for the
      // current user. If we have a full body in the partial, the user is
      // actively editing an anon-style cv that hasn't been imported. Convert
      // the failed PATCH into a POST so the CV materialises in the DB and
      // future saves succeed. Resolve waiters with the server-generated
      // record (caller can detect the id change and update its URL).
      if (
        httpStatus === 404 &&
        entry.partial.data !== undefined &&
        entry.partial.data !== null
      ) {
        try {
          const promoted = await this.create(
            {
              title: entry.partial.title ?? "Nouveau CV",
              templateId: entry.partial.templateId ?? "classique",
            },
            entry.partial.data,
          );
          this.queue.delete(id);
          const waiters = entry.waiters;
          entry.waiters = [];
          for (const w of waiters) w.resolve(promoted);
          this.setStatus("saved");
          return;
        } catch (createErr) {
          // Fall through to error handling below.
          err = createErr;
        }
      }

      // Decide retryability by HTTP status, not by error code allowlist:
      // any 4xx is the client's fault and won't recover by retrying. Only
      // network errors (no httpStatus) and 5xx warrant the offline queue.
      const finalStatus =
        err instanceof CvStoreError
          ? (err as CvStoreError & { httpStatus?: number }).httpStatus
          : undefined;
      const isClientError =
        typeof finalStatus === "number" &&
        finalStatus >= 400 &&
        finalStatus < 500;
      if (isClientError) {
        this.queue.delete(id);
        for (const w of entry.waiters) w.reject(err);
        entry.waiters = [];
        this.setStatus("error");
        return;
      }
      // Network / 5xx — stay queued, schedule retry
      this.setStatus("offline");
      const initial = this.opts.retry?.initialMs ?? DEFAULT_INITIAL_BACKOFF;
      const max = this.opts.retry?.maxMs ?? DEFAULT_MAX_BACKOFF;
      const delay = Math.min(max, initial * Math.pow(2, entry.attempts - 1));
      setTimeout(() => {
        void this.flush(id);
      }, delay);
    }
  }

  private async drainQueue(): Promise<void> {
    for (const [id, entry] of this.queue.entries()) {
      if (!entry.inflight) {
        await this.flush(id);
      }
    }
  }

  async moveCv(id: string, folderId: string): Promise<void> {
    await this.request<unknown>(
      `/api/v1/cv/${encodeURIComponent(id)}/move`,
      { method: "POST", body: JSON.stringify({ folderId }) },
    );
  }

  async hardDeleteCv(id: string): Promise<void> {
    await this.request<unknown>(`/api/v1/cv/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await this.opts.local.hardDeleteCv(id);
  }

  async clearDraft(id: string): Promise<void> {
    // Drop the local cache so a stale body can't rehydrate the form on the
    // next mount. The server copy stays put — UI semantics treat this as
    // "blank the editor" rather than "delete the row".
    await this.opts.local.clearDraft(id);
  }

  async bulkImport(records: AnonExport[]): Promise<ImportResult> {
    return this.request<ImportResult>("/api/v1/cv/import", {
      method: "POST",
      body: JSON.stringify(
        records.map((r) => ({
          id: r.id,
          title: r.title,
          templateId: r.templateId,
          data: r.data,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      ),
    });
  }
}
