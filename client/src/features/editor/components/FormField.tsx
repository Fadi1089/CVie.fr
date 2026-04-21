import { useId } from "react";
import { useFormContext } from "react-hook-form";
import type {
  FieldErrors,
  FieldPath,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";
import { cn } from "@/lib/utils";

const INPUT_CLASSES =
  "block min-h-11 w-full rounded-md border border-[var(--color-ink)]/15 bg-white px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-soft)] focus-visible:border-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 disabled:cursor-not-allowed disabled:bg-[var(--color-paper-deep)] disabled:opacity-70 aria-[invalid=true]:border-red-600/80 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-600/25 motion-reduce:transition-none";

type BaseProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  spellCheck?: boolean;
  /** Forwarded to `register(name, options)` — use for `setValueAs` etc. */
  registerOptions?: RegisterOptions<T, FieldPath<T>>;
};

type InputType = "text" | "email" | "tel" | "url";

type InputProps<T extends FieldValues> = BaseProps<T> & {
  as?: "input";
  type?: InputType;
};

type TextareaProps<T extends FieldValues> = BaseProps<T> & {
  as: "textarea";
  rows?: number;
};

type SelectProps<T extends FieldValues> = BaseProps<T> & {
  as: "select";
  children: React.ReactNode;
  /**
   * If true, the placeholder option stays selectable so the user can clear
   * a previously chosen value back to "none". Use for optional selects.
   */
  placeholderSelectable?: boolean;
};

type FormFieldProps<T extends FieldValues> =
  | InputProps<T>
  | TextareaProps<T>
  | SelectProps<T>;

/** Map input types to the most appropriate mobile inputMode. */
const INPUT_MODE_MAP: Record<InputType, React.HTMLAttributes<HTMLInputElement>["inputMode"]> = {
  text: undefined,
  email: "email",
  tel: "tel",
  url: "url",
};

/**
 * Walks `errors` using a dot path so nested RHF error objects (e.g.
 * `formations.2.degree`) resolve correctly. RHF stores these under nested
 * keys matching the field path — no helper is exposed publicly. Falls back
 * to a generic French message when the node has an error shape but no
 * readable string message.
 */
function readError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: FieldPath<T>,
): string | undefined {
  const parts = (name as string).split(".");
  let node: unknown = errors;
  for (const part of parts) {
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
  // Error shape with no readable message — fall back so the user at least
  // sees that the field is invalid.
  if ("type" in node || "ref" in node) return "Champ invalide";
  return undefined;
}

/**
 * Generic label + input/textarea/select + error-slot wrapper, fully wired
 * to React Hook Form. The whole primitive meets the story's a11y + touch-
 * target requirements in one place so every section form gets them for free.
 */
export function FormField<T extends FieldValues>(props: FormFieldProps<T>) {
  const {
    name,
    label,
    register,
    errors,
    hint,
    required,
    placeholder,
    autoComplete,
    className,
    spellCheck,
    registerOptions,
  } = props;
  const reactId = useId();
  const inputId = `${reactId}-${(name as string).replace(/\./g, "-")}`;
  const errorId = `${inputId}-error`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorMessage = readError(errors, name);
  const describedBy =
    [hintId, errorMessage ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;
  const ariaInvalid = errorMessage ? true : undefined;
  const ariaRequired = required || undefined;

  // Browser autofill (native Chrome/Safari + extensions like 1Password /
  // LastPass) often mutates DOM values without firing the synthetic-change
  // events RHF relies on. Worse, autofill fills several fields at once, so
  // a blur-only sync would only capture the field the user happens to
  // click on afterward. Two belt-and-braces hooks cover every path:
  //   1. `onAnimationStart` — fires the moment the browser applies
  //      `:-webkit-autofill` styling (CSS keyframe in globals.css).
  //      Covers native Chrome/Safari autofill on every field, simultaneously.
  //   2. `syncedOnBlur` — captures extension-driven fills, context-menu
  //      paste, and any other DOM mutation that doesn't trigger the
  //      animation (Firefox, some password managers).
  const { setValue } = useFormContext<T>();
  const registered = register(name, registerOptions);
  const syncDomValue = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
    setValue(name, el.value as never, {
      shouldDirty: true,
      shouldValidate: false,
      shouldTouch: false,
    });
  };
  const syncedOnBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setValue(name, e.target.value as never, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    registered.onBlur(e);
  };
  const onAutofillAnimation = (
    e: React.AnimationEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (e.animationName === "autofill-detected") {
      syncDomValue(e.currentTarget);
    }
  };

  const labelNode = (
    <label
      htmlFor={inputId}
      className="block text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-soft)]"
    >
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );

  const hintNode = hint ? (
    <p id={hintId} className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
      {hint}
    </p>
  ) : null;

  const errorNode = errorMessage ? (
    <p id={errorId} role="alert" className="mt-1 text-[12px] text-red-700">
      {errorMessage}
    </p>
  ) : null;

  if (props.as === "textarea") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {labelNode}
        <textarea
          id={inputId}
          placeholder={placeholder}
          rows={props.rows ?? 4}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          aria-describedby={describedBy}
          autoComplete={autoComplete}
          spellCheck={spellCheck}
          className={cn(INPUT_CLASSES, "min-h-[6.5rem] resize-y leading-6")}
          {...registered}
          onBlur={syncedOnBlur}
          onAnimationStart={onAutofillAnimation}
        />
        {hintNode}
        {errorNode}
      </div>
    );
  }

  if (props.as === "select") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {labelNode}
        <select
          id={inputId}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          aria-describedby={describedBy}
          className={cn(INPUT_CLASSES, "appearance-none bg-white pr-8")}
          {...registered}
          onBlur={syncedOnBlur}
          onAnimationStart={onAutofillAnimation}
        >
          {placeholder ? (
            <option value="" disabled={!props.placeholderSelectable}>
              {placeholder}
            </option>
          ) : null}
          {props.children}
        </select>
        {hintNode}
        {errorNode}
      </div>
    );
  }

  const type = props.type ?? "text";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {labelNode}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        inputMode={INPUT_MODE_MAP[type]}
        className={INPUT_CLASSES}
        {...registered}
        onBlur={syncedOnBlur}
        onAnimationStart={onAutofillAnimation}
      />
      {hintNode}
      {errorNode}
    </div>
  );
}
