import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles } from "./styles";
import type { Customization } from "./customization";
import type { ThemeRenderOptions } from "../types";

type SectionKey = "work" | "education" | "skills" | "languages" | "interests";

const LABELS: Record<SupportedLocale, Record<SectionKey, string>> = {
  fr: { work: "Expériences", education: "Formation", skills: "Compétences", languages: "Langues", interests: "Intérêts" },
  en: { work: "Experience", education: "Education", skills: "Skills", languages: "Languages", interests: "Interests" },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(title: string, body: string): string {
  return `<section class="cv-section"><h2 class="cv-section-title">${escapeHtml(title)}</h2>${body}</section>`;
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(w.position)}</div>
      <div class="cv-entry-org">${escapeHtml(w.name)}${w.location ? ` · ${escapeHtml(w.location)}` : ""}</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(formatDateRange(w.startDate, w.endDate, locale))}</div>
  </div>
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
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")}</div>
      <div class="cv-entry-org">${escapeHtml(e.institution)}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(formatDateRange(e.startDate, e.endDate, locale))}</div>
  </div>
</article>`.trim();
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = LABELS[locale] ?? LABELS.fr;
  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const sections: string[] = [];
  if (resume.work.length) sections.push(section(labels.work, resume.work.map((w) => workEntry(w, locale)).join("")));
  if (resume.education.length) sections.push(section(labels.education, resume.education.map((e) => eduEntry(e, locale)).join("")));
  if (resume.skills.length) {
    sections.push(
      section(
        labels.skills,
        resume.skills
          .map((s) => `<div class="cv-entry"><div class="cv-entry-title">${escapeHtml(s.name)}</div><div>${(s.keywords as string[]).map(escapeHtml).join(", ")}</div></div>`)
          .join(""),
      ),
    );
  }
  if (resume.languages.length) {
    sections.push(
      section(
        labels.languages,
        `<ul>${resume.languages.map((l) => `<li>${escapeHtml(l.language)}${l.fluency ? ` — ${escapeHtml(l.fluency)}` : ""}</li>`).join("")}</ul>`,
      ),
    );
  }
  if (resume.interests.length) {
    sections.push(
      section(
        labels.interests,
        resume.interests.map((i) => `<p>${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`).join(""),
      ),
    );
  }

  const linkedin = resume.basics.profiles.find((p) => p.network.toLowerCase() === "linkedin");

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <meta name="author" content="${escapeAttr(resume.basics.name)}" />
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-minimaliste">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
      ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
      <div class="cv-meta">
        ${resume.basics.email ? `<span>${escapeHtml(resume.basics.email)}</span>` : ""}
        ${resume.basics.phone ? `<span>${escapeHtml(resume.basics.phone)}</span>` : ""}
        ${resume.basics.location?.city ? `<span>${escapeHtml(resume.basics.location.city)}</span>` : ""}
        ${resume.basics.url ? `<span><a href="${escapeAttr(resume.basics.url)}">${escapeHtml(resume.basics.url)}</a></span>` : ""}
        ${linkedin?.url ? `<span><a href="${escapeAttr(linkedin.url)}">${escapeHtml(linkedin.username ?? linkedin.url)}</a></span>` : ""}
      </div>
    </header>
    ${sections.join("\n")}
  </main>
</body>
</html>`;
}
