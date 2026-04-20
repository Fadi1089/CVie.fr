import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { TemplateId, TemplateMeta } from "@cvie/shared";
import { cn } from "../../../lib/utils";
import { TemplatePreviewFrame } from "./TemplatePreviewFrame";

type TemplateCardProps = {
  template: TemplateMeta;
  index: number;
  total: number;
  onSelect: (id: TemplateId) => void;
  isSelected?: boolean;
};

/**
 * Each card carries the template's visual signature via:
 *   - an accent rail on the far left (brand color, rounded to match the card)
 *   - three palette chips in the header row
 *   - its live-filled A4 thumbnail
 */
const SIGNATURES: Record<
  TemplateId,
  { stripe: string; chips: [string, string, string]; motif: string }
> = {
  classique: {
    stripe: "#1E3A5F",
    chips: ["#1E3A5F", "#B89968", "#FAFAF7"],
    motif: "Parisien traditionnel",
  },
  moderne: {
    stripe: "#2D5F3F",
    chips: ["#2D5F3F", "#E6F6EC", "#FAFAF7"],
    motif: "Contemporain éditorial",
  },
  minimaliste: {
    stripe: "#0A0A0A",
    chips: ["#0A0A0A", "#E8E6DF", "#FAFAF7"],
    motif: "Éditorial minimal",
  },
};

function formatIndex(i: number, total: number) {
  return `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}

export function TemplateCard({
  template,
  index,
  total,
  onSelect,
  isSelected = false,
}: TemplateCardProps) {
  const sig = SIGNATURES[template.id];

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      aria-label={`Sélectionner le template ${template.name}`}
      aria-pressed={isSelected}
      style={{ ["--tpl-index" as string]: index }}
      className={cn(
        "tpl-card-reveal group relative flex flex-col overflow-hidden rounded-[20px] text-left",
        "bg-white",
        "border border-[var(--color-rule)]",
        "shadow-[0_1px_0_0_rgba(10,10,10,0.03),0_20px_40px_-24px_rgba(10,10,10,0.12)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_1px_0_0_rgba(10,10,10,0.04),0_30px_60px_-24px_rgba(10,10,10,0.2)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]",
        isSelected &&
          "ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-paper)]",
      )}
    >
      {/* Accent rail: inset a touch from the card edge, top-bottom only, so
         it doesn't fight the rounded corners. */}
      <span
        aria-hidden="true"
        className="absolute top-5 bottom-5 left-0 w-[3px] rounded-r-full"
        style={{ background: sig.stripe }}
      />

      {/* Header — number + palette chips. Uniform padding, no gradient. */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-rule)] px-6 pt-4 pb-3">
        <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
          {formatIndex(index, total)}
        </span>
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {sig.chips.map((c, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Thumbnail — fills width via container queries */}
      <div className="relative">
        <TemplatePreviewFrame templateId={template.id} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5"
        />
      </div>

      {/* Metadata — name on its own line; description below; motif + ATS
         sharing the bottom row. Text left-indents align with the header. */}
      <div className="flex flex-1 flex-col gap-3 border-t border-[var(--color-rule)] px-6 pt-4 pb-5">
        <h3 className="font-display text-[26px] font-medium leading-none tracking-tight text-[var(--color-ink)]">
          {template.name}
        </h3>
        <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">
          {template.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[var(--color-ink)]">
              <ShieldCheck aria-hidden="true" className="h-3 w-3" />
              <span>Compatible ATS</span>
            </span>
            <span className="font-mono-caps truncate text-[9px] text-[var(--color-ink-soft)]">
              {sig.motif}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1 font-mono-caps text-[10px] text-[var(--color-ink)] opacity-60 transition-all duration-300 group-hover:gap-2 group-hover:opacity-100 motion-reduce:transition-none"
          >
            Choisir
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}
