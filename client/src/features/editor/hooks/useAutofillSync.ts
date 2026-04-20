import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";

export type AutofillSyncApi = {
  formRef: MutableRefObject<HTMLElement | null>;
  /** Imperatively push every named input's DOM value into RHF state. */
  syncAll: () => void;
  /** Ready-to-use React `onBlurCapture` handler for the wrapper element. */
  onBlurCapture: () => void;
};

/**
 * Shares the autofill-sync API with descendants so callers that bypass the
 * blur-capture path (e.g. EditorPreviewPane's Refresh click) can run a
 * sync explicitly before reading `getValues()`.
 */
export const AutofillSyncContext = createContext<AutofillSyncApi | null>(null);

export function useAutofillSyncContext(): AutofillSyncApi | null {
  return useContext(AutofillSyncContext);
}

/**
 * Walks every named `<input>` / `<textarea>` / `<select>` inside `formEl`
 * and pushes its current DOM value into RHF state. Idempotent — only
 * writes when the DOM value actually differs from the RHF-tracked value.
 *
 * Why this exists: browser autofill (native Chrome/Safari + password-
 * manager extensions like Brave/1Password/LastPass) fills several fields
 * at once but often bypasses the synthetic-change events RHF relies on.
 * Only the field the user happens to focus next gets captured via blur;
 * the rest get wiped on next validation because RHF still thinks they're
 * empty.
 *
 * The hook returns:
 *   - `formRef` — attach to the wrapper element containing all inputs
 *   - `syncAll` — imperative sync trigger (post-mount, focus events, etc.)
 *   - `onBlurCapture` — ready-to-use handler for the wrapper
 *
 * The wrapper uses `onBlurCapture` so when the user blurs any field (by
 * tabbing, clicking another field, or clicking outside the form), every
 * autofilled sibling gets synced at once.
 */
export function useAutofillSync<T extends FieldValues>() {
  const formRef = useRef<HTMLElement | null>(null);
  const { setValue, getValues } = useFormContext<T>();

  const syncAll = useCallback(() => {
    const root = formRef.current;
    if (!root) return;
    const isVisibleControl = (
      el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    ) => {
      if (el.disabled) return false;
      if (el.matches("[hidden], [aria-hidden='true']")) return false;
      if (el.closest("[hidden], [aria-hidden='true']")) return false;
      return el.getClientRects().length > 0;
    };
    const selector =
      "input[name]:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea[name], select[name]";
    const inputs = root.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(selector);
    inputs.forEach((el) => {
      if (!isVisibleControl(el)) return;
      const name = el.name as Path<T>;
      if (!name) return;
      const domValue = el.value;
      const rhfValue = getValues(name);
      // Only update if DOM diverges from RHF state — avoids needlessly
      // flipping `isDirty` on every blur and keeps the update cost low.
      if (domValue === rhfValue) return;
      if (rhfValue == null && domValue === "") return;
      setValue(name, domValue as never, {
        shouldDirty: true,
        shouldValidate: false,
        shouldTouch: false,
      });
    });
  }, [getValues, setValue]);

  const onBlurCapture = useCallback(() => {
    // Sync synchronously so callers that programmatically blur + read
    // RHF state (e.g. EditorPreviewPane.refresh calling
    // `activeElement.blur()` then `getValues()`) see the up-to-date values.
    // RHF's setValue mutates internal refs synchronously, so getValues()
    // right after this returns the freshly-synced shape.
    syncAll();
    // And a deferred pass for browsers where autofill commits the .value
    // property slightly after the blur event bubbles (observed on Safari).
    window.setTimeout(syncAll, 0);
  }, [syncAll]);

  // Post-mount sweep: autofill may have fired before the listeners attached
  // (e.g., Safari pre-fill on page load). Run twice with a small gap to
  // catch both "instant fill" and "fill-after-paint" browsers.
  useEffect(() => {
    const t1 = window.setTimeout(syncAll, 100);
    const t2 = window.setTimeout(syncAll, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [syncAll]);

  return { formRef, syncAll, onBlurCapture };
}
