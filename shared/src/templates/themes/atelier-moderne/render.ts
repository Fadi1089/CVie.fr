import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles } from "./styles";
import type { Customization } from "./customization";
import type { ThemeRenderOptions } from "../types";

const IMAGE_PROTOCOL_RE = /^(https?:\/\/|data:image\/)/i;

type SectionKey = "work" | "education" | "skills" | "languages" | "interests";

const LABELS: Record<SupportedLocale, Record<SectionKey, string>> = {
  fr: { work: "Expériences", education: "Formation", skills: "Compétences", languages: "Langues", interests: "Intérêts" },
  en: { work: "Experience", education: "Education", skills: "Skills", languages: "Languages", interests: "Interests" },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(cls: "aside" | "main", title: string, body: string): string {
  return `<section class="cv-section cv-section-${cls}"><h2 class="cv-section-title">${escapeHtml(title)}</h2>${body}</section>`;
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-title">${escapeHtml(w.position)} <span class="cv-entry-org">— ${escapeHtml(w.name)}</span></div>
  <div class="cv-entry-dates">${escapeHtml(formatDateRange(w.startDate, w.endDate, locale))}${
    w.location ? ` · ${escapeHtml(w.location)}` : ""
  }</div>
  ${
    w.highlights.length
      ? `<ul class="cv-bullets">${w.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
      : ""
  }
</article>`.trim();
}

function eduEntry(e: JsonResume["education"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")} <span class="cv-entry-org">— ${escapeHtml(e.institution)}</span></div>
  <div class="cv-entry-dates">${escapeHtml(formatDateRange(e.startDate, e.endDate, locale))}${
    e.location ? ` · ${escapeHtml(e.location)}` : ""
  }</div>
  ${e.summary ? `<p>${escapeHtml(e.summary)}</p>` : ""}
</article>`.trim();
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = LABELS[locale] ?? LABELS.fr;
  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const linkedin = resume.basics.profiles.find((p) => p.network.toLowerCase() === "linkedin");
  const rawImage = resume.basics.image;
  const showPhoto = typeof rawImage === "string" && rawImage.length > 0 && IMAGE_PROTOCOL_RE.test(rawImage);
  const photo = showPhoto
    ? `<img class="cv-photo" src="${escapeAttr(rawImage)}" alt="" />`
    : "";

  const mainSections: string[] = [];
  if (resume.work.length) {
    mainSections.push(
      section("main", labels.work, resume.work.map((w) => workEntry(w, locale)).join("")),
    );
  }
  if (resume.education.length) {
    mainSections.push(
      section("main", labels.education, resume.education.map((e) => eduEntry(e, locale)).join("")),
    );
  }

  const asideSections: string[] = [];
  if (resume.skills.length) {
    asideSections.push(
      section(
        "aside",
        labels.skills,
        resume.skills
          .map(
            (s) =>
              `<div class="cv-skill-row"><div class="cv-entry-title">${escapeHtml(s.name)}</div><div>${(s.keywords as string[]).map(escapeHtml).join(", ")}</div></div>`,
          )
          .join(""),
      ),
    );
  }
  if (resume.languages.length) {
    asideSections.push(
      section(
        "aside",
        labels.languages,
        `<ul>${resume.languages.map((l) => `<li><span class="cv-entry-title">${escapeHtml(l.language)}</span>${l.fluency ? ` — ${escapeHtml(l.fluency)}` : ""}</li>`).join("")}</ul>`,
      ),
    );
  }
  if (resume.interests.length) {
    asideSections.push(
      section(
        "aside",
        labels.interests,
        resume.interests
          .map((i) => `<p>${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`)
          .join(""),
      ),
    );
  }

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <meta name="author" content="${escapeAttr(resume.basics.name)}" />
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-moderne">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <div>
        <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
        ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
        ${resume.basics.summary ? `<p class="cv-summary">${escapeHtml(resume.basics.summary)}</p>` : ""}
      </div>
      <div class="cv-meta">
        ${resume.basics.email ? `<span>${escapeHtml(resume.basics.email)}</span>` : ""}
        ${resume.basics.phone ? `<span>${escapeHtml(resume.basics.phone)}</span>` : ""}
        ${resume.basics.location?.city ? `<span>${escapeHtml(resume.basics.location.city)}</span>` : ""}
        ${resume.basics.url ? `<span><a href="${escapeAttr(resume.basics.url)}">${escapeHtml(resume.basics.url)}</a></span>` : ""}
        ${linkedin?.url ? `<span><a href="${escapeAttr(linkedin.url)}">${escapeHtml(linkedin.username ?? linkedin.url)}</a></span>` : ""}
        ${photo}
      </div>
    </header>
    ${asideSections.join("\n")}
    ${mainSections.join("\n")}
  </main>
</body>
</html>`;
}
