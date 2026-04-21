import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  useFormContext,
  useFormState,
  useWatch,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// Dynamic floor so the picker covers users whose education/careers
// predate 1980 without manual maintenance.
const MIN_YEAR_OFFSET = 70;
// Extend a few years into the future for "diplôme prévu en…" cases.
const MAX_YEAR_OFFSET = 5;

/** Sentinel for "en cours / aujourd'hui" end dates. */
const PRESENT_SENTINEL = "present";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  /** When true, show a "Présent / en cours" checkbox that stores `"present"`. */
  allowPresent?: boolean;
};

const SELECT_CLASSES =
  "block min-h-11 w-full rounded-md border border-[var(--color-ink)]/15 bg-white px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition-colors focus-visible:border-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 aria-[invalid=true]:border-red-600/80 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-600/25 disabled:cursor-not-allowed disabled:bg-[var(--color-paper-deep)] disabled:opacity-70 motion-reduce:transition-none";

/**
 * Walks `errors` by dot path (same helper as `FormField`) to pull a field's
 * error message string out of RHF's nested error tree.
 */
function readErrorMessage(
  errors: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  if (!errors) return undefined;
  let node: unknown = errors;
  for (const part of name.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (!node || typeof node !== "object") return undefined;
  if (
    "message" in node &&
    typeof (node as { message: unknown }).message === "string" &&
    (node as { message: string }).message.length > 0
  ) {
    return (node as { message: string }).message;
  }
  if ("type" in node || "ref" in node) return "Champ invalide";
  return undefined;
}

/**
 * Two native `<select>`s (month + year) composed into a single `"YYYY-MM"`
 * string at the RHF field `name`. Writes via `setValue` with
 * `shouldDirty: true` so the persistence layer picks up changes, and
 * `shouldValidate: true` so the form-level `isValid` reflects date edits.
 *
 * If `allowPresent` is true, a "Présent / en cours" checkbox stores the
 * literal sentinel `"present"`, distinct from `""` (never set). The
 * renderer's `formatDateRange` maps `"present"` to "aujourd'hui".
 */
export function MonthYearPicker<T extends FieldValues>({
  name,
  label,
  required,
  allowPresent,
}: Props<T>) {
  const { register, setValue, control } = useFormContext<T>();
  const rawValue = useWatch({ control, name }) as string | undefined;
  const { errors } = useFormState({ control, name });
  const reactId = useId();
  const monthId = `${reactId}-${(name as string).replace(/\./g, "-")}-month`;
  const yearId = `${reactId}-${(name as string).replace(/\./g, "-")}-year`;
  const errorId = `${reactId}-${(name as string).replace(/\./g, "-")}-error`;
  const presentNoteId = `${reactId}-${(name as string).replace(/\./g, "-")}-presentnote`;

  // Register the underlying path so RHF tracks errors / dirty state for it.
  // We render a hidden input bound to `register` below (`ref` attached), so
  // RHF has a real reference and doesn't lose the field on unmount. Avoid a
  // manual `unregister()` cleanup here: inside `useFieldArray`, row deletions
  // reindex surviving items, and unregistering the old path can wipe the
  // shifted row's current value.
  const registerProps = register(name);

  // Cache the last non-empty concrete date so unticking "Présent" can
  // restore it rather than wiping the user's pre-present value.
  const lastConcreteRef = useRef<string>("");

  const isPresent =
    Boolean(allowPresent) && rawValue === PRESENT_SENTINEL;

  const parsed = useMemo(() => {
    if (typeof rawValue !== "string" || rawValue === PRESENT_SENTINEL) {
      return { year: "", month: "" };
    }
    const match = /^(\d{4})-(\d{2})$/.exec(rawValue);
    if (!match) return { year: "", month: "" };
    return { year: match[1], month: match[2] };
  }, [rawValue]);

  // Local draft for partial selections. The previous version wrote "" to RHF
  // when only one of {month, year} was picked, which re-rendered the select
  // back to empty — making it impossible to pick both in sequence. We now
  // keep partial state here and only commit once both halves are set.
  const [draft, setDraft] = useState<{ month: string; year: string }>({
    month: parsed.month,
    year: parsed.year,
  });

  // Sync local draft whenever the RHF-tracked value changes from the outside
  // (hydration, "Présent" toggle, programmatic reset). Guarded so we don't
  // clobber an in-progress partial selection.
  useEffect(() => {
    setDraft((prev) => {
      if (prev.month === parsed.month && prev.year === parsed.year) return prev;
      return { month: parsed.month, year: parsed.year };
    });
  }, [parsed.month, parsed.year]);

  // Track the last concrete YYYY-MM so the present-toggle round-trip
  // preserves user data.
  useEffect(() => {
    if (parsed.year && parsed.month) {
      lastConcreteRef.current = `${parsed.year}-${parsed.month}`;
    }
  }, [parsed.year, parsed.month]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const minYear = now - MIN_YEAR_OFFSET;
    const end = now + MAX_YEAR_OFFSET;
    const list: number[] = [];
    for (let y = end; y >= minYear; y -= 1) list.push(y);
    // If a stored value has a year outside the [min, max] range, include
    // it so the select doesn't render blank.
    const storedYear = Number.parseInt(draft.year || parsed.year, 10);
    if (
      !Number.isNaN(storedYear) &&
      !list.includes(storedYear) &&
      storedYear > 0
    ) {
      list.push(storedYear);
      list.sort((a, b) => b - a);
    }
    return list;
  }, [parsed.year, draft.year]);

  function writeValue(value: string, options?: { validate?: boolean }) {
    setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: options?.validate ?? false,
      shouldTouch: true,
    });
  }

  function commitPartial(year: string, month: string) {
    setDraft({ month, year });
    if (year && month) {
      writeValue(`${year}-${month}`, { validate: true });
    } else if (!year && !month) {
      writeValue("", { validate: false });
    }
    // Else: one half present, one missing — preserve previous committed value.
  }

  function togglePresent(checked: boolean) {
    if (checked) {
      writeValue(PRESENT_SENTINEL, { validate: true });
    } else {
      const restored = lastConcreteRef.current || "";
      writeValue(restored, { validate: restored.length > 0 });
    }
  }

  const partialWarn =
    !isPresent && ((draft.month && !draft.year) || (!draft.month && draft.year));

  const errorMessage = readErrorMessage(
    errors as Record<string, unknown>,
    name as string,
  );
  const ariaInvalid = errorMessage ? true : undefined;
  const describedBy = [
    errorMessage ? errorId : undefined,
    isPresent ? presentNoteId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="block text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      {/* Hidden input carries the real register ref so RHF tracks this field. */}
      <input type="hidden" {...registerProps} aria-hidden="true" />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={monthId} className="sr-only">
            {label} — mois
          </label>
          <select
            id={monthId}
            value={draft.month}
            onChange={(e) => commitPartial(draft.year, e.target.value)}
            disabled={isPresent}
            aria-invalid={ariaInvalid}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            className={SELECT_CLASSES}
          >
            <option value="">Mois</option>
            {MONTHS_FR.map((monthName, idx) => {
              const v = String(idx + 1).padStart(2, "0");
              return (
                <option key={v} value={v}>
                  {monthName}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={yearId} className="sr-only">
            {label} — année
          </label>
          <select
            id={yearId}
            value={draft.year}
            onChange={(e) => commitPartial(e.target.value, draft.month)}
            disabled={isPresent}
            aria-invalid={ariaInvalid}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            className={SELECT_CLASSES}
          >
            <option value="">Année</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {allowPresent ? (
        <label className="mt-1 inline-flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={isPresent}
            onChange={(e) => togglePresent(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-ink)]/20"
          />
          Présent / en cours
        </label>
      ) : null}
      {isPresent ? (
        <p id={presentNoteId} className="sr-only">
          Sélection de date désactivée car la case Présent / en cours est
          cochée.
        </p>
      ) : null}
      {partialWarn ? (
        <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
          Sélectionnez le mois et l'année.
        </p>
      ) : null}
      {errorMessage ? (
        <p id={errorId} role="alert" className="mt-1 text-[12px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
