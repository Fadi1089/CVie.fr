import { useCallback, useEffect, useState } from "react";
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
  hardDeleteCv: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<Folder>;
  deleteFolder: (id: string, moveCvsTo: string) => Promise<void>;
  bulkImport: (records: AnonExport[]) => Promise<ImportResult>;
};

export function useCvLibrary(): UseCvLibrary {
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
      await refresh();
      return r;
    },
    moveCv: async (id, folderId) => {
      await store.moveCv(id, folderId);
      await refresh();
    },
    hardDeleteCv: async (id) => {
      await store.hardDeleteCv(id);
      await refresh();
    },
    createFolder: async (name) => {
      const f = await store.createFolder(name);
      await refresh();
      return f;
    },
    renameFolder: async (id, name) => {
      const f = await store.renameFolder(id, name);
      await refresh();
      return f;
    },
    deleteFolder: async (id, moveCvsTo) => {
      await store.deleteFolder(id, moveCvsTo);
      await refresh();
    },
    bulkImport: async (records) => {
      const r = await store.bulkImport(records);
      await refresh();
      return r;
    },
  };
}
