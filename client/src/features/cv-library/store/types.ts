import type { CvData, TemplateId } from "@cvie/shared";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

export type CvLibraryRecord = {
  id: string;
  title: string;
  templateId: TemplateId;
  // null only for anon (LocalCvStore has no folder model)
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  isSystem: boolean;
  ttlDays: number | null;
};

export type AnonExport = {
  id: string;
  title: string;
  templateId: TemplateId;
  data: CvData;
  createdAt?: string;
  updatedAt: string;
};

export type ImportResult = {
  imported: Array<{
    oldId: string;
    newId: string;
    title: string;
    templateId: TemplateId;
    updatedAt: string;
    folderId: string;
  }>;
  skipped: Array<{ oldId: string; reason: "LIMIT" | "VALIDATION" }>;
};

export interface CvStore {
  // Folders (DB-only; LocalCvStore returns [] / throws NotSupported on mutators)
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  deleteFolder(id: string, moveCvsTo: string): Promise<void>;

  // CVs
  listActive(): Promise<CvLibraryRecord[]>;
  listTrash(): Promise<CvLibraryRecord[]>;
  read(id: string): Promise<CvData | null>;
  create(
    record: { title: string; templateId: TemplateId; folderId?: string },
    body: CvData,
  ): Promise<CvLibraryRecord>;
  patch(
    id: string,
    partial: Partial<{ title: string; templateId: TemplateId; data: CvData }>,
  ): Promise<CvLibraryRecord>;
  moveCv(id: string, folderId: string): Promise<void>;
  hardDeleteCv(id: string): Promise<void>;
  bulkImport(records: AnonExport[]): Promise<ImportResult>;

  // Status stream for UI badge
  subscribeStatus(cb: (s: SyncStatus) => void): () => void;
}

export class CvStoreError extends Error {
  constructor(
    public readonly code:
      | "NOT_SUPPORTED"
      | "OFFLINE"
      | "VALIDATION"
      | "LIMIT_EXCEEDED"
      | "FOLDER_NAME_CONFLICT"
      | "FOLDER_LIMIT_EXCEEDED"
      | "FOLDER_IS_SYSTEM"
      | "NOT_FOUND"
      | "UNAUTHENTICATED"
      | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "CvStoreError";
  }
}
