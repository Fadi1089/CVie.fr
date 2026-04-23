import { type TemplateId } from "@cvie/shared";

export type CvLibraryRecord = {
  id: string;
  title: string;
  templateId: TemplateId;
  createdAt: string;
  updatedAt: string;
};

const LIBRARY_STORAGE_KEY = "cvie.cv.library.v1";
const LEGACY_TEMPLATE_KEY = "cvie.template.selected";
const SEEDED_DEMO_IDS = new Set([
  "cv-product-lead",
  "cv-data-storytelling",
  "cv-ux-strategy",
]);
const nowIso = new Date().toISOString();

const DEFAULT_LIBRARY: CvLibraryRecord[] = [
  {
    id: "cv-main",
    title: "Mon CV",
    templateId: "classique",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

function safeStorage(): Pick<typeof window.localStorage, "getItem" | "setItem"> | null {
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

function writeLibrary(records: CvLibraryRecord[]) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage write issues
  }
}

function createSingleCvFromLegacy(storage: Pick<typeof window.localStorage, "getItem">) {
  const legacyTemplate = storage.getItem(LEGACY_TEMPLATE_KEY);
  const templateId =
    legacyTemplate === "classique" ||
    legacyTemplate === "moderne" ||
    legacyTemplate === "minimaliste"
      ? legacyTemplate
      : "classique";
  return [
    {
      ...DEFAULT_LIBRARY[0],
      templateId,
    },
  ] satisfies CvLibraryRecord[];
}

export function readCvLibrary(): CvLibraryRecord[] {
  const storage = safeStorage();
  if (!storage) return DEFAULT_LIBRARY;
  try {
    const raw = storage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      writeLibrary(DEFAULT_LIBRARY);
      return DEFAULT_LIBRARY;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LIBRARY;
    const validated = parsed.filter(isRecord);
    if (!validated.length) return DEFAULT_LIBRARY;
    const onlySeededDemo =
      validated.length === SEEDED_DEMO_IDS.size &&
      validated.every((record) => SEEDED_DEMO_IDS.has(record.id));
    if (onlySeededDemo) {
      const migrated = createSingleCvFromLegacy(storage);
      writeLibrary(migrated);
      return migrated;
    }
    return [...validated].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch {
    return DEFAULT_LIBRARY;
  }
}

export function upsertCvRecord(
  cvId: string,
  update: Partial<Pick<CvLibraryRecord, "title" | "templateId" | "updatedAt">>,
): CvLibraryRecord {
  const records = readCvLibrary();
  const existing = records.find((r) => r.id === cvId);
  const now = new Date().toISOString();
  const next: CvLibraryRecord = existing
    ? {
        ...existing,
        ...update,
        updatedAt: update.updatedAt ?? now,
      }
    : {
        id: cvId,
        title: update.title?.trim() || "Nouveau CV",
        templateId: update.templateId ?? "classique",
        createdAt: now,
        updatedAt: update.updatedAt ?? now,
      };
  const merged = [...records.filter((r) => r.id !== cvId), next].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  writeLibrary(merged);
  return next;
}

export function createCvRecord(templateId: TemplateId, title?: string): CvLibraryRecord {
  const id = `cv-${Date.now()}`;
  return upsertCvRecord(id, {
    title: title?.trim() || "Nouveau CV",
    templateId,
  });
}

export function formatUpdatedAt(isoDate: string): string {
  const updated = new Date(isoDate);
  const now = new Date();
  const msDiff = now.getTime() - updated.getTime();
  const dayDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));
  if (dayDiff <= 0) return "Mis a jour aujourd'hui";
  if (dayDiff === 1) return "Mis a jour hier";
  if (dayDiff < 7) return `Mis a jour il y a ${dayDiff} jours`;
  return `Mis a jour le ${updated.toLocaleDateString("fr-FR")}`;
}

