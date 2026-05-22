export function NotesSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-mono-caps text-[11px] tracking-[0.18em]">NOTES PERSONNELLES</h2>
      <textarea
        value={value}
        maxLength={8000}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-64 w-full rounded-lg border border-[var(--color-rule)] p-3 text-sm"
        placeholder="Tout ce que vous voulez retenir mais ne pas afficher sur un CV."
      />
      <p className="mt-1 text-[10px] text-[var(--color-ink-soft)]">
        {value.length} / 8000
      </p>
    </section>
  );
}
