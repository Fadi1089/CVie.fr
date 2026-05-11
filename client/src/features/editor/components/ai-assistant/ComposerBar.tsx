import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

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

  return (
    <form
      onSubmit={onFormSubmit}
      className="flex flex-col gap-2 border-t border-[var(--color-rule)] bg-white px-3 py-2"
    >
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-soft,#fbf7f0)] px-2 py-0.5 text-[11px]"
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
        <div className="text-[11px] text-red-700">{fileError}</div>
      )}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
          aria-label="Joindre un fichier"
        >
          <span aria-hidden>📎</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={onFilesPicked}
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Demander à l'assistant…"
          className="max-h-32 min-h-[36px] flex-1 resize-none rounded-md border border-[var(--color-rule)] bg-white px-2.5 py-1.5 text-[13px] text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Message pour l'assistant"
        />
        {busy ? (
          <Button type="button" variant="outline" size="sm" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={disabled || !hasContent}>
            Envoyer
          </Button>
        )}
      </div>
    </form>
  );
}
