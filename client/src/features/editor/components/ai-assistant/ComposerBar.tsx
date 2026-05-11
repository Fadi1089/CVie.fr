import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function ComposerBar({ disabled, busy, onSend, onStop }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || busy) return;
    onSend(trimmed);
    setValue("");
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

  return (
    <form
      onSubmit={onFormSubmit}
      className="flex items-end gap-2 border-t border-[var(--color-rule)] bg-white px-3 py-2"
    >
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
        <Button type="submit" size="sm" disabled={disabled || value.trim().length === 0}>
          Envoyer
        </Button>
      )}
    </form>
  );
}
