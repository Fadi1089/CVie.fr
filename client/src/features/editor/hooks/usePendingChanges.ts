import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useFormContext } from "react-hook-form";
import type { CvData } from "@cvie/shared";

export type PendingChange = {
  path: string;
  before: unknown;
  after: unknown;
  toolCallId: string;
};

export type Section =
  | "experiences"
  | "formations"
  | "skills"
  | "languages"
  | "interests";

export type PendingItemAction = "add" | "remove";

export type PendingItem = {
  section: Section;
  id: string;
  action: PendingItemAction;
  item: { id: string } & Record<string, unknown>;
  toolCallId: string;
};

export type UsePendingChangesReturn = {
  changes: PendingChange[];
  items: PendingItem[];
  count: number;
  add: (patches: Omit<PendingChange, "toolCallId">[], toolCallId: string) => void;
  keep: (path: string) => void;
  revert: (path: string) => void;
  keepItem: (section: Section, id: string) => void;
  revertItem: (section: Section, id: string) => void;
  keepAll: () => void;
  revertAll: () => void;
  clear: () => void;
};

const SECTION_RE = /^(experiences|formations|skills|languages|interests)$/;
const ITEM_RE = /^(experiences|formations|skills|languages|interests)\.(\d+)$/;
const SECTION_NAMES: readonly Section[] = [
  "experiences",
  "formations",
  "skills",
  "languages",
  "interests",
];

// Server emits paths with bracket notation (`experiences[0].jobTitle`,
// `experiences[0].bullets[1]`); React Hook Form uses dot notation
// (`experiences.0.jobTitle`). Normalize at the boundary so FormField's
// `usePendingChange(name)` lookups match by the same canonical key the
// form already uses.
function normalizePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, ".$1");
}

function isSection(value: string): value is Section {
  return (SECTION_NAMES as readonly string[]).includes(value);
}

type IdItem = { id: string } & Record<string, unknown>;

function itemKey(section: Section, id: string): string {
  return `${section}::${id}`;
}

function usePendingChangesState(): UsePendingChangesReturn {
  const { setValue, getValues, reset } = useFormContext<CvData>();
  const [byPath, setByPath] = useState<Map<string, PendingChange>>(() => new Map());
  const [byItem, setByItem] = useState<Map<string, PendingItem>>(() => new Map());

  const applyToForm = useCallback(
    (path: string, value: unknown) => {
      // Whole-array patches (path = "skills", "experiences", …) and whole-item
      // patches ("experiences.2") need form.reset so useFieldArray re-syncs
      // its internal fields list. Plain setValue would update the form data
      // but leave the rendered field array stale.
      const sectionMatch = path.match(SECTION_RE);
      if (sectionMatch) {
        const current = getValues();
        const next = {
          ...current,
          [sectionMatch[1]!]: value,
        } as CvData;
        reset(next, { keepDirty: true, keepTouched: true, keepErrors: true });
        return;
      }
      const itemMatch = path.match(ITEM_RE);
      if (itemMatch) {
        const section = itemMatch[1]!;
        const idx = parseInt(itemMatch[2]!, 10);
        const current = getValues();
        const arr = [
          ...((current as unknown as Record<string, unknown[]>)[section] ?? []),
        ];
        arr[idx] = value;
        const next = {
          ...current,
          [section]: arr,
        } as CvData;
        reset(next, { keepDirty: true, keepTouched: true, keepErrors: true });
        return;
      }
      // RHF paths are typed against CvData; assistant emits arbitrary paths
      // matched by name, not by static type. Cast to escape the path union.
      (setValue as (n: string, v: unknown, o?: object) => void)(path, value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue, getValues, reset],
  );

  const readFromForm = useCallback(
    (path: string): unknown => {
      return (getValues as (n: string) => unknown)(path);
    },
    [getValues],
  );

  const readSectionArray = useCallback(
    (section: Section): IdItem[] => {
      const arr = (getValues() as unknown as Record<string, unknown>)[section];
      return Array.isArray(arr) ? (arr as IdItem[]) : [];
    },
    [getValues],
  );

  const writeSectionArray = useCallback(
    (section: Section, arr: IdItem[]) => {
      const current = getValues();
      const next = { ...current, [section]: arr } as CvData;
      reset(next, { keepDirty: true, keepTouched: true, keepErrors: true });
    },
    [getValues, reset],
  );

  // Handle a whole-array section patch by deriving per-item add/remove
  // entries. Form state holds: (current section ∪ added) without dropping
  // pending-remove items, so the user sees both deletions (kept visible
  // with a red overlay) and insertions (shown with a green overlay).
  const ingestSectionPatch = useCallback(
    (section: Section, before: IdItem[], after: IdItem[], toolCallId: string) => {
      const beforeIds = new Set(before.map((x) => x.id));
      const afterIds = new Set(after.map((x) => x.id));
      const added = after.filter((x) => !beforeIds.has(x.id));
      const removed = before.filter((x) => !afterIds.has(x.id));

      const current = readSectionArray(section);
      const currentIds = new Set(current.map((x) => x.id));
      const nextArr: IdItem[] = [...current];

      // Re-insert removed items at their original positions if not already
      // present (e.g., the AI already deleted them and we want them
      // visible until the user confirms).
      for (const item of removed) {
        if (currentIds.has(item.id)) continue;
        const originalIdx = before.findIndex((x) => x.id === item.id);
        const target = originalIdx >= 0 && originalIdx < nextArr.length ? originalIdx : nextArr.length;
        nextArr.splice(target, 0, item);
        currentIds.add(item.id);
      }
      // Append added items not already present.
      for (const item of added) {
        if (currentIds.has(item.id)) continue;
        nextArr.push(item);
        currentIds.add(item.id);
      }
      writeSectionArray(section, nextArr);

      setByItem((prev) => {
        const next = new Map(prev);
        for (const item of added) {
          next.set(itemKey(section, item.id), {
            section,
            id: item.id,
            action: "add",
            item,
            toolCallId,
          });
        }
        for (const item of removed) {
          next.set(itemKey(section, item.id), {
            section,
            id: item.id,
            action: "remove",
            item,
            toolCallId,
          });
        }
        return next;
      });
    },
    [readSectionArray, writeSectionArray],
  );

  const add = useCallback(
    (patches: Omit<PendingChange, "toolCallId">[], toolCallId: string) => {
      if (patches.length === 0) return;
      const sectionPatches: { section: Section; before: IdItem[]; after: IdItem[] }[] = [];
      const fieldPatches: { path: string; before: unknown; after: unknown }[] = [];
      for (const raw of patches) {
        const path = normalizePath(raw.path);
        if (isSection(path)) {
          sectionPatches.push({
            section: path,
            before: Array.isArray(raw.before) ? (raw.before as IdItem[]) : [],
            after: Array.isArray(raw.after) ? (raw.after as IdItem[]) : [],
          });
        } else {
          fieldPatches.push({ path, before: raw.before, after: raw.after });
        }
      }
      if (fieldPatches.length > 0) {
        setByPath((prev) => {
          const next = new Map(prev);
          for (const fp of fieldPatches) {
            const existing = next.get(fp.path);
            const before = existing ? existing.before : readFromForm(fp.path) ?? fp.before;
            next.set(fp.path, { path: fp.path, before, after: fp.after, toolCallId });
            applyToForm(fp.path, fp.after);
          }
          return next;
        });
      }
      for (const sp of sectionPatches) {
        ingestSectionPatch(sp.section, sp.before, sp.after, toolCallId);
      }
    },
    [applyToForm, readFromForm, ingestSectionPatch],
  );

  const keep = useCallback((path: string) => {
    setByPath((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const revert = useCallback(
    (path: string) => {
      setByPath((prev) => {
        const entry = prev.get(path);
        if (!entry) return prev;
        applyToForm(entry.path, entry.before);
        const next = new Map(prev);
        next.delete(path);
        return next;
      });
    },
    [applyToForm],
  );

  // Keep a pending item: commit the AI's intent and drop the marker.
  // - "add" → item is already in form; nothing else to do.
  // - "remove" → item is still in form (we left it for visibility); drop it.
  const keepItem = useCallback(
    (section: Section, id: string) => {
      setByItem((prev) => {
        const entry = prev.get(itemKey(section, id));
        if (!entry) return prev;
        if (entry.action === "remove") {
          const current = readSectionArray(section);
          writeSectionArray(section, current.filter((x) => x.id !== id));
        }
        const next = new Map(prev);
        next.delete(itemKey(section, id));
        return next;
      });
    },
    [readSectionArray, writeSectionArray],
  );

  // Revert a pending item: undo the AI's intent.
  // - "add" → item was inserted; remove it.
  // - "remove" → item is still in form (kept visible); leave it.
  const revertItem = useCallback(
    (section: Section, id: string) => {
      setByItem((prev) => {
        const entry = prev.get(itemKey(section, id));
        if (!entry) return prev;
        if (entry.action === "add") {
          const current = readSectionArray(section);
          writeSectionArray(section, current.filter((x) => x.id !== id));
        }
        const next = new Map(prev);
        next.delete(itemKey(section, id));
        return next;
      });
    },
    [readSectionArray, writeSectionArray],
  );

  const keepAll = useCallback(() => {
    setByPath(new Map());
    setByItem((prev) => {
      // Apply all "remove" actions, then clear.
      const removalsBySection = new Map<Section, Set<string>>();
      for (const entry of prev.values()) {
        if (entry.action !== "remove") continue;
        let set = removalsBySection.get(entry.section);
        if (!set) {
          set = new Set();
          removalsBySection.set(entry.section, set);
        }
        set.add(entry.id);
      }
      for (const [section, ids] of removalsBySection) {
        const current = readSectionArray(section);
        writeSectionArray(
          section,
          current.filter((x) => !ids.has(x.id)),
        );
      }
      return new Map();
    });
  }, [readSectionArray, writeSectionArray]);

  const revertAll = useCallback(() => {
    setByPath((prev) => {
      for (const entry of prev.values()) {
        applyToForm(entry.path, entry.before);
      }
      return new Map();
    });
    setByItem((prev) => {
      // Drop all pending "add" items from form; keep "remove" items (they
      // were never actually removed, so reverting means leaving them in).
      const addsBySection = new Map<Section, Set<string>>();
      for (const entry of prev.values()) {
        if (entry.action !== "add") continue;
        let set = addsBySection.get(entry.section);
        if (!set) {
          set = new Set();
          addsBySection.set(entry.section, set);
        }
        set.add(entry.id);
      }
      for (const [section, ids] of addsBySection) {
        const current = readSectionArray(section);
        writeSectionArray(
          section,
          current.filter((x) => !ids.has(x.id)),
        );
      }
      return new Map();
    });
  }, [applyToForm, readSectionArray, writeSectionArray]);

  const clear = useCallback(() => {
    setByPath(new Map());
    setByItem(new Map());
  }, []);

  const changes = Array.from(byPath.values());
  const items = Array.from(byItem.values());

  return {
    changes,
    items,
    count: changes.length + items.length,
    add,
    keep,
    revert,
    keepItem,
    revertItem,
    keepAll,
    revertAll,
    clear,
  };
}

const PendingChangesContext = createContext<UsePendingChangesReturn | null>(null);

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  const value = usePendingChangesState();
  return createElement(PendingChangesContext.Provider, { value }, children);
}

export function usePendingChanges(): UsePendingChangesReturn {
  const ctx = useContext(PendingChangesContext);
  if (!ctx) {
    throw new Error("usePendingChanges must be used inside PendingChangesProvider");
  }
  return ctx;
}

export type PendingChangeHandle = {
  before: unknown;
  after: unknown;
  keep: () => void;
  revert: () => void;
};

export function usePendingChange(path: string): PendingChangeHandle | null {
  const ctx = useContext(PendingChangesContext);
  if (!ctx) return null;
  const change = ctx.changes.find((c) => c.path === path);
  if (!change) return null;
  return {
    before: change.before,
    after: change.after,
    keep: () => ctx.keep(path),
    revert: () => ctx.revert(path),
  };
}

export type PendingItemHandle = {
  action: PendingItemAction;
  keep: () => void;
  revert: () => void;
};

export function usePendingItem(section: Section, id: string): PendingItemHandle | null {
  const ctx = useContext(PendingChangesContext);
  if (!ctx) return null;
  const entry = ctx.items.find((it) => it.section === section && it.id === id);
  if (!entry) return null;
  return {
    action: entry.action,
    keep: () => ctx.keepItem(section, id),
    revert: () => ctx.revertItem(section, id),
  };
}
