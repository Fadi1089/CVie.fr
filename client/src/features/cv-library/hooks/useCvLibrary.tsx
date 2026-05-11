import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useCvStore } from "./useCvStore";
import type {
  AnonExport,
  CvLibraryRecord,
  Folder,
  ImportResult,
  SyncStatus,
} from "../store/types";
import type { CvData, TemplateId } from "@cvie/shared";

export type UseCvLibrary = {
  active: CvLibraryRecord[];
  trash: CvLibraryRecord[];
  folders: Folder[];
  status: SyncStatus;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createCv: (
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ) => Promise<CvLibraryRecord>;
  moveCv: (id: string, folderId: string) => Promise<void>;
  renameCv: (id: string, title: string) => Promise<void>;
  setCvTemplate: (id: string, templateId: TemplateId) => Promise<void>;
  hardDeleteCv: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<Folder>;
  deleteFolder: (id: string, moveCvsTo: string) => Promise<void>;
  bulkImport: (records: AnonExport[]) => Promise<ImportResult>;
};

const CvLibraryContext = createContext<UseCvLibrary | null>(null);

// Internal hook — instantiates state + store wiring. Kept separate from the
// public `useCvLibrary` so multiple consumers can share one instance via the
// provider rather than each spawning their own state (which caused renames
// in the editor to not propagate to the sidebar until refresh).
function useCvLibraryState(): UseCvLibrary {
  const store = useCvStore();
  const [active, setActive] = useState<CvLibraryRecord[]>([]);
  const [trash, setTrash] = useState<CvLibraryRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t, f] = await Promise.all([
        store.listActive(),
        store.listTrash().catch(() => []),
        store.listFolders().catch(() => []),
      ]);
      setActive(a);
      setTrash(t);
      setFolders(f);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
    return store.subscribeStatus(setStatus);
  }, [store, refresh]);

  return {
    active,
    trash,
    folders,
    status,
    loading,
    error,
    refresh,
    createCv: async (record, body) => {
      const r = await store.create(record, body);
      // Optimistic: surface the new row instantly so the caller can navigate
      // and the sidebar render reads it on the next pass without waiting on
      // the listActive round-trip.
      setActive((prev) => [r, ...prev.filter((p) => p.id !== r.id)]);
      void refresh();
      return r;
    },
    moveCv: async (id, folderId) => {
      // Optimistic: pull the row out of active/trash and slot it under the
      // target folder so the UI updates instantly. Background-refresh
      // reconciles with the server's source of truth.
      const prevActive = active;
      const prevTrash = trash;
      const target = folders.find((f) => f.id === folderId);
      const isTargetTrash =
        target?.isSystem === true && target?.ttlDays !== null;
      const removed =
        prevActive.find((r) => r.id === id) ??
        prevTrash.find((r) => r.id === id);
      if (removed) {
        setActive(prevActive.filter((r) => r.id !== id));
        setTrash(prevTrash.filter((r) => r.id !== id));
        const moved: CvLibraryRecord = { ...removed, folderId };
        if (isTargetTrash) setTrash([moved, ...prevTrash.filter((r) => r.id !== id)]);
        else setActive([moved, ...prevActive.filter((r) => r.id !== id)]);
      }
      try {
        await store.moveCv(id, folderId);
      } catch (err) {
        // Roll back on failure.
        setActive(prevActive);
        setTrash(prevTrash);
        throw err;
      }
      void refresh();
    },
    renameCv: async (id, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const prevActive = active;
      const prevTrash = trash;
      setActive((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: trimmed } : r)),
      );
      setTrash((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: trimmed } : r)),
      );
      try {
        await store.patch(id, { title: trimmed });
      } catch (err) {
        setActive(prevActive);
        setTrash(prevTrash);
        throw err;
      }
    },
    setCvTemplate: async (id, templateId) => {
      const prevActive = active;
      const prevTrash = trash;
      setActive((prev) =>
        prev.map((r) => (r.id === id ? { ...r, templateId } : r)),
      );
      setTrash((prev) =>
        prev.map((r) => (r.id === id ? { ...r, templateId } : r)),
      );
      try {
        await store.patch(id, { templateId });
      } catch (err) {
        setActive(prevActive);
        setTrash(prevTrash);
        throw err;
      }
    },
    hardDeleteCv: async (id) => {
      const prevActive = active;
      const prevTrash = trash;
      setActive(prevActive.filter((r) => r.id !== id));
      setTrash(prevTrash.filter((r) => r.id !== id));
      try {
        await store.hardDeleteCv(id);
      } catch (err) {
        setActive(prevActive);
        setTrash(prevTrash);
        throw err;
      }
      void refresh();
    },
    createFolder: async (name) => {
      // Append a temp placeholder synchronously so the sidebar updates the
      // moment the user hits Enter; swap it for the real row when the
      // server responds. Roll back if the create fails.
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tempFolder: Folder = {
        id: tempId,
        name,
        isSystem: false,
        ttlDays: null,
      };
      setFolders((prev) => [...prev, tempFolder]);
      try {
        const f = await store.createFolder(name);
        setFolders((prev) => prev.map((p) => (p.id === tempId ? f : p)));
        void refresh();
        return f;
      } catch (err) {
        setFolders((prev) => prev.filter((p) => p.id !== tempId));
        throw err;
      }
    },
    renameFolder: async (id, name) => {
      const f = await store.renameFolder(id, name);
      setFolders((prev) => prev.map((p) => (p.id === id ? f : p)));
      void refresh();
      return f;
    },
    deleteFolder: async (id, moveCvsTo) => {
      await store.deleteFolder(id, moveCvsTo);
      setFolders((prev) => prev.filter((p) => p.id !== id));
      // CVs were re-parented server-side; surface that in active/trash too.
      setActive((prev) =>
        prev.map((c) => (c.folderId === id ? { ...c, folderId: moveCvsTo } : c)),
      );
      void refresh();
    },
    bulkImport: async (records) => {
      const r = await store.bulkImport(records);
      await refresh();
      return r;
    },
  };
}

export function CvLibraryProvider({ children }: { children: ReactNode }) {
  const value = useCvLibraryState();
  return (
    <CvLibraryContext.Provider value={value}>
      {children}
    </CvLibraryContext.Provider>
  );
}

export function useCvLibrary(): UseCvLibrary {
  const ctx = useContext(CvLibraryContext);
  if (!ctx) {
    throw new Error(
      "useCvLibrary must be used within a CvLibraryProvider — wrap the route in <CvLibraryProvider>",
    );
  }
  return ctx;
}
