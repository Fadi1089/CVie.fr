import { useCallback, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { cvDataSchema, SUPPORTED_LOCALES, type CvData, type LocaleCode } from "@cvie/shared";
import { cn } from "@/lib/utils";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

const LANGUAGES: ReadonlyArray<{
  code: LocaleCode;
  flag: string;
  label: string;
}> = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "nl", flag: "🇳🇱", label: "Nederlands" },
];

const DEFAULT_LOCALE: LocaleCode = "fr";

type TranslateStatus = "idle" | "pending" | "error" | "success";

export function LanguagePanel() {
  const { control, setValue, getValues, reset } = useFormContext<CvData>();
  const { fetch: authFetch } = useAuthApi();
  const locale = useWatch({ control, name: "appearance.locale" }) ?? DEFAULT_LOCALE;
  const [status, setStatus] = useState<TranslateStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setLocale = useCallback(
    (next: LocaleCode) => {
      setValue("appearance.locale", next, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setStatus("idle");
      setErrorMessage(null);
    },
    [setValue],
  );

  const translate = useCallback(async () => {
    setStatus("pending");
    setErrorMessage(null);
    try {
      const cv = getValues();
      const res = await authFetch("/api/v1/cv/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, targetLang: locale }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const ct = res.headers.get("Content-Type") ?? "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            detail = typeof j?.message === "string" ? j.message : JSON.stringify(j);
          } else {
            detail = await res.text();
          }
        } catch {
          // ignore parse error
        }
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const parsed = cvDataSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Réponse de traduction invalide");
      }
      // Reset the entire form to the translated CV. Preserve user's
      // appearance settings (palette, locale) since they aren't translatable.
      reset(
        {
          ...parsed.data,
          appearance: {
            ...(parsed.data.appearance ?? {}),
            palette: cv.appearance?.palette,
            locale,
          },
        },
        { keepDirty: true },
      );
      setStatus("success");
    } catch (err) {
      console.error("[LanguagePanel] translate failed:", err);
      const detail = err instanceof Error ? err.message : "";
      setErrorMessage(
        detail
          ? `Échec de la traduction (${detail}). Réessayez dans un instant.`
          : "Échec de la traduction. Réessayez dans un instant.",
      );
      setStatus("error");
    }
  }, [getValues, locale, reset]);

  const isPending = status === "pending";
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]!;

  return (
    <div
      role="tabpanel"
      id="editor-section-langue"
      aria-labelledby="editor-tab-langue"
      className="flex w-full flex-col gap-4"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            Langue
          </p>
          <h2 className="font-display mt-1 text-[18px] font-medium text-[var(--color-ink)]">
            Langue du CV
          </h2>
        </div>
        <span className="text-[16px]" aria-hidden="true">
          {current.flag}
        </span>
      </header>

      <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
        Choisissez la langue cible. Le bouton ci-dessous traduit l'intégralité
        du contenu du CV via l'IA en conservant la mise en forme.
      </p>

      <div className="rounded-md border border-[var(--color-rule)] bg-white/75 p-1">
        <ul role="radiogroup" aria-label="Langue du CV" className="flex flex-col">
          {LANGUAGES.map((lang) => {
            const active = lang.code === locale;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLocale(lang.code)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors duration-150 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30",
                    active
                      ? "bg-[var(--color-ink)]/5"
                      : "hover:bg-[var(--color-ink)]/3",
                  )}
                >
                  <span aria-hidden="true" className="text-[18px] leading-none">
                    {lang.flag}
                  </span>
                  <span className="flex-1 text-[13px] text-[var(--color-ink)]">
                    {lang.label}
                  </span>
                  <span
                    className={cn(
                      "font-mono-caps text-[10px] tracking-[0.14em]",
                      active
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-soft)]",
                    )}
                  >
                    {active ? "Active" : lang.code.toUpperCase()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        {SUPPORTED_LOCALES.includes(locale) ? null : (
          <p
            role="alert"
            className="text-[11px] text-amber-800"
          >
            Langue non supportée — réinitialiser à français.
          </p>
        )}
        <button
          type="button"
          onClick={translate}
          disabled={isPending}
          aria-busy={isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[var(--color-ink)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        >
          {isPending ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          ) : null}
          {isPending
            ? "Traduction en cours…"
            : `Traduire avec IA → ${current.label}`}
        </button>
        {errorMessage ? (
          <p role="alert" className="text-[11px] text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {status === "success" ? (
          <p className="font-mono-caps text-[10px] tracking-[0.14em] text-[var(--color-ink-soft)]">
            CV traduit · {current.flag} {current.label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
