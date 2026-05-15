export type SupportedLocale = "fr" | "en" | "de" | "es" | "nl";

const PRESENT_FR = "présent";
const PRESENT_EN = "Present";
const PRESENT_DE = "heute";
const PRESENT_ES = "actualidad";
const PRESENT_NL = "heden";

const PRESENT_BY_LOCALE: Record<SupportedLocale, string> = {
  fr: PRESENT_FR,
  en: PRESENT_EN,
  de: PRESENT_DE,
  es: PRESENT_ES,
  nl: PRESENT_NL,
};

/** Maps CVie's `"present" | "" | "YYYY-MM"` to JSON Resume's `string | undefined`. */
export function cvDateToIso(s: string | undefined): string | undefined {
  if (!s || s === "present") return undefined;
  return s;
}

/** Locale-aware month formatter. Falls back to the raw ISO string on unknown locales. */
export function isoDateToHuman(
  iso: string | undefined,
  locale: SupportedLocale,
): string {
  if (!iso) return "";
  const knownLocales: readonly SupportedLocale[] = ["fr", "en", "de", "es", "nl"];
  if (!knownLocales.includes(locale)) return iso;
  const m = /^(\d{4})-(\d{2})(-(\d{2}))?$/.exec(iso);
  if (!m) return iso;
  const year = Number.parseInt(m[1]!, 10);
  const month = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return iso;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Renders "start — end" with locale-aware month names and "present" fallback. */
export function formatDateRange(
  startIso: string | undefined,
  endIso: string | undefined,
  locale: SupportedLocale,
): string {
  const start = isoDateToHuman(startIso, locale);
  const end =
    endIso === undefined ? PRESENT_BY_LOCALE[locale] : isoDateToHuman(endIso, locale);
  if (start && end) return `${start} — ${end}`;
  return start || end;
}
