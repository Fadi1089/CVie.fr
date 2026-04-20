import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  templateRegistry,
  type TemplateId,
  type TemplateMeta,
} from "@cvie/shared";
import { TemplateCard } from "./TemplateCard";

const STORAGE_KEY = "cvie.template.selected";

function readStoredSelection(): TemplateId | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const match = templateRegistry.find((t) => t.id === raw);
  if (!match) {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return match.id;
}

function TemplateSkeletonCard({ index }: { index: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ ["--tpl-index" as string]: index }}
      className="tpl-card-reveal flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-rule)] bg-white"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-6 pt-4 pb-3">
        <span className="h-3 w-14 animate-pulse rounded bg-[var(--color-paper-deep)] motion-reduce:animate-none" />
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-paper-deep)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-paper-deep)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-paper-deep)]" />
        </span>
      </div>
      <div className="aspect-[1/1.4142] animate-pulse bg-[var(--color-paper-deep)] motion-reduce:animate-none" />
      <div className="flex flex-col gap-3 border-t border-[var(--color-rule)] px-6 pt-4 pb-5">
        <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-paper-deep)] motion-reduce:animate-none" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--color-paper-deep)] motion-reduce:animate-none" />
        <div className="mt-auto h-6 w-28 animate-pulse rounded-full bg-[var(--color-paper-deep)] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function TemplateBrowser() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<TemplateId | null>(null);

  useEffect(() => {
    setSelected(readStoredSelection());
    // Skeleton rehearsal — real data is synchronous today, but this simulates
    // the network path used in later stories (TanStack Query, Story 2.2+).
    const t = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = useCallback(
    (id: TemplateId) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Quota exceeded / storage disabled — selection still works via URL.
      }
      navigate(`/editor?template=${id}`);
    },
    [navigate],
  );

  return (
    <div className="atelier-paper relative min-h-screen text-[var(--color-ink)]">
      {/* Sticky top chrome — breadcrumb + atelier label.
         Layered above the vignette but below any modals (z=5). */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-rule)] bg-[rgba(250,250,247,0.82)] px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="font-mono-caps text-[10px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] motion-reduce:transition-none"
            >
              ← CVie.fr
            </Link>
            <span className="text-[var(--color-dot)]">/</span>
            <span className="font-mono-caps text-[10px] text-[var(--color-ink)]">
              Bibliothèque
            </span>
          </div>
          <span className="hidden font-mono-caps text-[10px] text-[var(--color-ink-soft)] sm:inline">
            {templateRegistry.length} templates · Mise à jour 2026
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-[1] mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div
          style={{ ["--tpl-hero-delay" as string]: "0ms" }}
          className="tpl-hero-reveal font-mono-caps text-[10px] text-[var(--color-ink-soft)]"
        >
          Nº 01 — Bibliothèque de templates
        </div>

        <h1
          style={{ ["--tpl-hero-delay" as string]: "80ms" }}
          className="tpl-hero-reveal font-display mt-6 max-w-4xl text-[44px] leading-[0.95] font-normal tracking-[-0.02em] text-[var(--color-ink)] sm:text-[56px] md:text-[72px] lg:text-[88px]"
        >
          Choisissez votre
          <span
            className="italic"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 1' }}
          >
            {" "}signature
          </span>
          .
        </h1>

        <p
          style={{ ["--tpl-hero-delay" as string]: "160ms" }}
          className="tpl-hero-reveal mt-8 max-w-[36rem] text-[15px] leading-relaxed text-[var(--color-ink-soft)]"
        >
          Trois fondations éditoriales — toutes compatibles ATS, toutes
          modifiables à volonté. Choisissez un style, commencez à rédiger. Vous
          changerez d’avis sans perdre une ligne.
        </p>

        {/* Meta rail — print-style specimen card */}
        <div
          style={{ ["--tpl-hero-delay" as string]: "240ms" }}
          className="tpl-hero-reveal mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[var(--color-rule)] pt-5 font-mono-caps text-[10px] text-[var(--color-ink-soft)]"
        >
          <span>
            <span className="text-[var(--color-ink)]">ATS</span> Workday ·
            Greenhouse · Taleez · SAP · Lever
          </span>
          <span>
            <span className="text-[var(--color-ink)]">Format</span> A4 · 210 × 297 mm
          </span>
          <span>
            <span className="text-[var(--color-ink)]">PDF</span> &lt; 3 s
          </span>
          <span>
            <span className="text-[var(--color-ink)]">Coût</span> 0 €. Toujours.
          </span>
        </div>
      </section>

      {/* Gallery */}
      <section className="relative z-[1] mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-6 flex items-baseline justify-between border-b border-[var(--color-rule)] pb-3">
          <h2 className="font-mono-caps text-[10px] text-[var(--color-ink)]">
            La collection
          </h2>
          <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            {loaded ? `${templateRegistry.length} pièces` : "chargement…"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {loaded
            ? templateRegistry.map((template: TemplateMeta, i) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={i}
                  total={templateRegistry.length}
                  onSelect={handleSelect}
                  isSelected={template.id === selected}
                />
              ))
            : [0, 1, 2].map((i) => <TemplateSkeletonCard key={i} index={i} />)}
        </div>

        <p className="mt-10 max-w-[28rem] font-mono-caps text-[10px] leading-relaxed text-[var(--color-ink-soft)]">
          Vous cherchez un style spécifique ? D’autres variantes arrivent.
          Votre contenu reste intact entre les templates.
        </p>
      </section>
    </div>
  );
}
