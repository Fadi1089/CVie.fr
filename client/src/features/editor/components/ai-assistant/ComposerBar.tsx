import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { ModelPickerPill } from "./ModelPickerPill";

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onSend: (text: string, files?: File[]) => void;
  onStop: () => void;
};

const MAX_FILES = 3;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = "application/pdf,image/*";

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return `${file.name}: dépasse 8 Mo.`;
  }
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    return `${file.name}: type non supporté.`;
  }
  return null;
}

export function ComposerBar({ disabled, busy, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    if (disabled || busy) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
    setFileError(null);
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onFilesPicked(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      setFileError(`Maximum ${MAX_FILES} pièces jointes.`);
      return;
    }
    const accepted: File[] = [];
    for (const f of picked.slice(0, remaining)) {
      const err = validateFile(f);
      if (err) {
        setFileError(err);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
      setFileError(null);
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const hasContent = value.trim().length > 0 || files.length > 0;
  const sendEnabled = !disabled && !busy && hasContent;

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col bg-white">
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-3 pt-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-soft,#fafaf7)] px-2 py-0.5 text-[11px]"
            >
              <span aria-hidden>{f.type === "application/pdf" ? "📄" : "🖼"}</span>
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-1 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                aria-label={`Retirer ${f.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {fileError && (
        <div className="px-3 pt-1 text-[11px] text-red-700">{fileError}</div>
      )}
      <div className="px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Pose ta question…"
          className="max-h-32 min-h-[40px] w-full resize-none rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-soft,#fafaf7)] px-3.5 py-3 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Message pour l'assistant"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5">
        <ModelPickerPill />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={onFilesPicked}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || files.length >= MAX_FILES}
            className="flex h-7 w-7 items-center justify-center rounded-[14px] border border-[var(--color-rule)] bg-[var(--color-paper-soft,#fafaf7)] text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Joindre un fichier"
            title="Joindre un fichier (PDF ou image, max 8 Mo)"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                d="M11.5 7.5l-4.5 4.5a2.5 2.5 0 1 1-3.5-3.5l5.5-5.5a1.5 1.5 0 0 1 2.1 2.1L6 10.5a.5.5 0 0 1-.7-.7L9.5 5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)] text-white transition-opacity hover:opacity-90"
              aria-label="Arrêter"
              title="Arrêter"
            >
              <span aria-hidden className="block h-2.5 w-2.5 bg-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!sendEnabled}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Envoyer"
              title="Envoyer (Entrée)"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
