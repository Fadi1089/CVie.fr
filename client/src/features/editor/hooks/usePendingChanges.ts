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

export type UsePendingChangesReturn = {
  changes: PendingChange[];
  count: number;
  add: (patches: Omit<PendingChange, "toolCallId">[], toolCallId: string) => void;
  keep: (path: string) => void;
  revert: (path: string) => void;
  keepAll: () => void;
  revertAll: () => void;
  clear: () => void;
};

function usePendingChangesState(): UsePendingChangesReturn {
  const { setValue, getValues } = useFormContext<CvData>();
  const [byPath, setByPath] = useState<Map<string, PendingChange>>(() => new Map());

  const applyToForm = useCallback(
    (path: string, value: unknown) => {
      // RHF paths are typed against CvData; assistant emits arbitrary paths
      // matched by name, not by static type. Cast to escape the path union.
      (setValue as (n: string, v: unknown, o?: object) => void)(path, value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue],
  );

  const readFromForm = useCallback(
    (path: string): unknown => {
      return (getValues as (n: string) => unknown)(path);
    },
    [getValues],
  );

  const add = useCallback(
    (patches: Omit<PendingChange, "toolCallId">[], toolCallId: string) => {
      if (patches.length === 0) return;
      setByPath((prev) => {
        const next = new Map(prev);
        for (const patch of patches) {
          const existing = next.get(patch.path);
          const before = existing ? existing.before : readFromForm(patch.path) ?? patch.before;
          next.set(patch.path, { ...patch, before, toolCallId });
          applyToForm(patch.path, patch.after);
        }
        return next;
      });
    },
    [applyToForm, readFromForm],
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

  const keepAll = useCallback(() => {
    setByPath(new Map());
  }, []);

  const revertAll = useCallback(() => {
    setByPath((prev) => {
      for (const entry of prev.values()) {
        applyToForm(entry.path, entry.before);
      }
      return new Map();
    });
  }, [applyToForm]);

  const clear = useCallback(() => {
    setByPath(new Map());
  }, []);

  const changes = Array.from(byPath.values());

  return {
    changes,
    count: changes.length,
    add,
    keep,
    revert,
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
