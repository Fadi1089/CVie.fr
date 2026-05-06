import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEmptyCv, cvDataSchema, type CvData } from "@cvie/shared";
import "@/lib/zodFrenchErrorMap";
import { useCvStore } from "@/features/cv-library/hooks/useCvStore";
import type { CvStore, SyncStatus } from "@/features/cv-library/store/types";

const DRAFT_STORAGE_KEY_PREFIX = "cvie.cv.draft";
// Backward-compatible export used by existing imports/tests.
export const DRAFT_STORAGE_KEY = DRAFT_STORAGE_KEY_PREFIX;
// Two-tier debounce contract (Story 2-3):
//   - preview (EditorPreviewPane `AUTO_REFRESH_DEBOUNCE_MS`) = 80 ms — NFR6 ≤100 ms p50.
//   - persistence = 300 ms — IO thrash guard. `pagehide` flushes the trailing window.
const PERSIST_DEBOUNCE_MS = 300;
const MAX_STORED_BYTES = 500_000;

export type PersistStatus = "idle" | "saving" | "saved" | "offline" | "failed";

export type UseCvDraftReturn = {
  form: UseFormReturn<CvData>;
  persistStatus: PersistStatus;
  hydrating: boolean;
  resetDraft: () => void;
};

export type UseCvDraftOptions = {
  onPersisted?: () => void;
  /** Fires when DbCvStore.patch promoted an unknown id to a fresh server-side
   *  CV. Caller (router) should redirect the URL to the new id. */
  onCvIdChanged?: (newId: string) => void;
  /** Test-only override. Production code uses `useCvStore()`. */
  store?: CvStore;
};

function syncStatusToPersist(s: SyncStatus): PersistStatus {
  switch (s) {
    case "saving":
      return "saving";
    case "saved":
      return "saved";
    case "offline":
      return "offline";
    case "error":
      return "failed";
    case "idle":
    default:
      return "idle";
  }
}

export function useCvDraft(cvId: string, options?: UseCvDraftOptions): UseCvDraftReturn {
  const ambientStore = useCvStore();
  const store = options?.store ?? ambientStore;

  const form = useForm<CvData>({
    resolver: zodResolver(cvDataSchema) as unknown as Resolver<CvData>,
    defaultValues: createEmptyCv(),
    mode: "onBlur",
  });
  const [persistStatus, setPersistStatus] = useState<PersistStatus>("idle");
  const [hydrating, setHydrating] = useState(true);

  const hasHydratedRef = useRef(false);
  const hasSeenHydratedSnapshotRef = useRef(false);
  const latestValuesRef = useRef<CvData>(form.getValues());
  const watchedValues = useWatch({ control: form.control });
  const onPersistedRef = useRef(options?.onPersisted);
  onPersistedRef.current = options?.onPersisted;
  const onCvIdChangedRef = useRef(options?.onCvIdChanged);
  onCvIdChangedRef.current = options?.onCvIdChanged;

  const writeNow = async (values: CvData) => {
    const parsed = cvDataSchema.safeParse(values);
    if (!parsed.success) return;
    const serialized = JSON.stringify(parsed.data);
    if (serialized.length > MAX_STORED_BYTES) {
      setPersistStatus("failed");
      return;
    }
    try {
      const rec = await store.patch(cvId, { data: parsed.data });
      // DbCvStore promotes a 404 PATCH to a fresh POST and resolves with the
      // server-generated record — its id won't match the requested cvId.
      if (rec.id !== cvId) {
        onCvIdChangedRef.current?.(rec.id);
      }
      onPersistedRef.current?.();
    } catch {
      setPersistStatus("failed");
    }
  };

  // Hydrate on cvId change via store. Reset the form to a clean empty
  // skeleton synchronously so the previous CV's data never leaks into the
  // preview while the read is in flight; flip hydrating off when the read
  // resolves so the preview pane can stop showing its loading state.
  useEffect(() => {
    let alive = true;
    setHydrating(true);
    hasHydratedRef.current = false;
    hasSeenHydratedSnapshotRef.current = false;
    form.reset(createEmptyCv());
    void store
      .read(cvId)
      .then((draft) => {
        if (!alive) return;
        if (draft) form.reset(draft);
        hasHydratedRef.current = true;
        setHydrating(false);
      })
      .catch(() => {
        if (!alive) return;
        hasHydratedRef.current = true;
        setHydrating(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, cvId]);

  // Forward store status into the local persistStatus.
  useEffect(() => {
    return store.subscribeStatus((s) => {
      setPersistStatus(syncStatusToPersist(s));
    });
  }, [store]);

  useEffect(() => {
    latestValuesRef.current = form.getValues();
  }, [form, watchedValues]);

  // Debounced persistence driven by `useWatch` (catches both field edits and
  // `useFieldArray` structural changes like remove()).
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!hasSeenHydratedSnapshotRef.current) {
      hasSeenHydratedSnapshotRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      void writeNow(form.getValues());
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, watchedValues]);

  useEffect(() => {
    return () => {
      if (!hasHydratedRef.current) return;
      void writeNow(latestValuesRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, cvId]);

  // Flush pending edits on tab close / hide.
  useEffect(() => {
    const flush = () => {
      if (!hasHydratedRef.current) return;
      void writeNow(form.getValues());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, store, cvId]);

  const resetDraft = () => {
    const empty = createEmptyCv();
    form.reset(empty);
    latestValuesRef.current = empty;
    // Bypass the watch-driven debounce: clear the persisted draft directly.
    // Without this, the empty form fails schema validation, no patch fires,
    // and the old body sits in localStorage / cache and rehydrates on reload.
    void store.clearDraft(cvId);
    setPersistStatus("idle");
  };

  return { form, persistStatus, hydrating, resetDraft };
}
