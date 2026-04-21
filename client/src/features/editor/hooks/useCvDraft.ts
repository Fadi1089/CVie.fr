import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEmptyCv, cvDataSchema, type CvData } from "@cvie/shared";
import "@/lib/zodFrenchErrorMap";

export const DRAFT_STORAGE_KEY = "cvie.cv.draft";
// Two-tier debounce contract (Story 2-3):
//   - preview (EditorPreviewPane `AUTO_REFRESH_DEBOUNCE_MS`) = 80 ms — NFR6 ≤100 ms p50.
//   - persistence (this constant) = 300 ms — localStorage write isn't in NFR6 scope and
//     per-keystroke IO thrashes slow devices. `pagehide` + `visibilitychange` flush
//     catches the trailing window. Do NOT unify these two values.
const PERSIST_DEBOUNCE_MS = 300;
// Hard cap to avoid main-thread freeze on a pathological key. Schema caps
// total string payload well below this; real drafts are under 50 KB.
const MAX_STORED_BYTES = 500_000;

type Storage = Pick<typeof window.localStorage, "getItem" | "setItem" | "removeItem">;

export type PersistStatus = "idle" | "saved" | "failed";

export type UseCvDraftReturn = {
  form: UseFormReturn<CvData>;
  persistStatus: PersistStatus;
  resetDraft: () => void;
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads `cvie.cv.draft` from localStorage, JSON-parses it, and validates it
 * against `cvDataSchema`. Returns `null` if missing, malformed, oversize, or
 * invalid — and silently removes the bad entry so it can't keep failing on
 * every load.
 */
function readStoredDraft(storage: Storage): CvData | null {
  let raw: string | null;
  try {
    raw = storage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  if (raw.length > MAX_STORED_BYTES) {
    try {
      storage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  try {
    const parsed = cvDataSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fallthrough — remove */
  }
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * React Hook Form wrapper for the CV editor.
 *
 * - Typed against `CvData` with `zodResolver(cvDataSchema)` — no redefinition.
 * - Hydrates from `localStorage["cvie.cv.draft"]` on mount, silently dropping
 *   malformed entries.
 * - Persists the full draft (debounced 300 ms) ONLY when the whole object
 *   passes `cvDataSchema.safeParse` — invalid / partial states never hit
 *   disk, so whatever's stored is always loadable.
 * - Returns a `persistStatus` flag the UI can read to warn the user when a
 *   write fails (quota exceeded, serializer throw, etc.) so work-in-
 *   progress doesn't silently die in a locked-down browser.
 *
 * The form's default values are `createEmptyCv()`, which is intentionally
 * NOT schema-valid (firstName/lastName are `.min(1)`). That's fine: the
 * validate-then-persist gate means the empty skeleton never gets written.
 */
export function useCvDraft(): UseCvDraftReturn {
  const form = useForm<CvData>({
    resolver: zodResolver(cvDataSchema) as unknown as Resolver<CvData>,
    defaultValues: createEmptyCv(),
    mode: "onBlur",
  });
  const [persistStatus, setPersistStatus] = useState<PersistStatus>("idle");
  const hasHydratedRef = useRef(false);
  const hasSeenHydratedSnapshotRef = useRef(false);
  const latestValuesRef = useRef<CvData>(form.getValues());
  const watchedValues = useWatch({ control: form.control });

  const writeNow = (storage: Storage, values: CvData) => {
    const parsed = cvDataSchema.safeParse(values);
    if (!parsed.success) return;
    const serialized = JSON.stringify(parsed.data);
    if (serialized.length > MAX_STORED_BYTES) {
      setPersistStatus("failed");
      return;
    }
    try {
      storage.setItem(DRAFT_STORAGE_KEY, serialized);
      setPersistStatus("saved");
    } catch {
      // Quota exceeded, serializer threw, localStorage disabled, etc.
      // Surface the failure so the UI can prompt the user to export.
      setPersistStatus("failed");
    }
  };

  // Hydrate on mount. `reset` triggers a re-render with the stored values,
  // so any subsequent `watch` notifications already see the hydrated state.
  useEffect(() => {
    const storage = safeStorage();
    if (!storage) {
      hasHydratedRef.current = true;
      hasSeenHydratedSnapshotRef.current = true;
      return;
    }
    const draft = readStoredDraft(storage);
    if (draft) form.reset(draft);
    hasHydratedRef.current = true;
    // form.reset is stable across renders; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    latestValuesRef.current = form.getValues();
  }, [form, watchedValues]);

  // Debounced persistence driven by `useWatch`, which reliably tracks both
  // regular field edits and `useFieldArray` structural changes like remove().
  useEffect(() => {
    const storage = safeStorage();
    if (!storage) return;
    if (!hasHydratedRef.current) return;
    if (!hasSeenHydratedSnapshotRef.current) {
      hasSeenHydratedSnapshotRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      writeNow(storage, form.getValues());
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [form, watchedValues]);

  useEffect(() => {
    return () => {
      const storage = safeStorage();
      if (!storage || !hasHydratedRef.current) return;
      writeNow(storage, latestValuesRef.current);
    };
  }, [form]);

  // Flush pending edits synchronously on tab close / hide so the 300ms
  // debounce doesn't drop the user's last keystroke.
  useEffect(() => {
    const storage = safeStorage();
    if (!storage) return;
    const flush = () => {
      if (!hasHydratedRef.current) return;
      writeNow(storage, form.getValues());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [form]);

  // Cross-tab awareness: another tab wrote to the same draft key. Soft-warn
  // only; don't auto-reset the user's in-memory form.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== DRAFT_STORAGE_KEY) return;
      if (!e.newValue) return;
      try {
        const parsed = cvDataSchema.safeParse(JSON.parse(e.newValue));
        if (parsed.success) {
          console.warn(
            "[useCvDraft] draft updated in another tab — local edits may diverge",
          );
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resetDraft = () => {
    const empty = createEmptyCv();
    form.reset(empty);
    latestValuesRef.current = empty;
    const storage = safeStorage();
    if (storage) {
      try {
        storage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setPersistStatus("idle");
  };

  return { form, persistStatus, resetDraft };
}
