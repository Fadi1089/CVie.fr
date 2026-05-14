import type { JsonResume } from "../../jsonResume/schema";
import { formatDateRange, isoDateToHuman, type SupportedLocale } from "../../jsonResume/dates";
import { normalize } from "../../jsonResume/normalize";
import { escapeHtml, escapeAttr } from "../_shared/htmlEscape";
import { BASE_PRINT_CSS } from "../_shared/printChrome";
import { atsOverridesCss } from "../_shared/atsProfile";
import { buildStyles } from "./styles";
import type { Customization } from "./customization";
import type { ThemeRenderOptions } from "../types";

const IMAGE_PROTOCOL_RE = /^(https?:\/\/|data:image\/)/i;

type SectionKey = "work" | "education" | "skills" | "languages" | "interests";
const SECTION_LABELS: Record<SupportedLocale, Record<SectionKey, string>> = {
  fr: {
    work: "Expériences",
    education: "Formation",
    skills: "Compétences",
    languages: "Langues",
    interests: "Centres d'intérêt",
  },
  en: {
    work: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
  de: { work: "Berufserfahrung", education: "Ausbildung", skills: "Fähigkeiten", languages: "Sprachen", interests: "Interessen" },
  es: { work: "Experiencia", education: "Formación", skills: "Competencias", languages: "Idiomas", interests: "Intereses" },
  nl: { work: "Ervaring", education: "Opleiding", skills: "Vaardigheden", languages: "Talen", interests: "Interesses" },
};

function section(num: number, title: string, body: string): string {
  return `
<section class="cv-section">
  <header class="cv-section-header">
    <span class="cv-section-num" data-decorative>${num.toString().padStart(2, "0")}.</span>
    <h2 class="cv-section-title">${title}</h2>
    <span class="cv-section-rule" data-decorative></span>
  </header>
  ${body}
</section>`.trim();
}

function workEntry(w: JsonResume["work"][number], locale: SupportedLocale): string {
  const range = formatDateRange(w.startDate, w.endDate, locale);
  const bullets =
    w.highlights.length === 0
      ? ""
      : `<ul class="cv-bullets">${w.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`;
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(w.position)}</div>
      <div class="cv-entry-org">${escapeHtml(w.name)}${
        w.location ? ` · ${escapeHtml(w.location)}` : ""
      }</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(range)}</div>
  </div>
  ${w.summary ? `<p class="cv-entry-summary">${escapeHtml(w.summary)}</p>` : ""}
  ${bullets}
</article>`.trim();
}

function eduEntry(e: JsonResume["education"][number], locale: SupportedLocale): string {
  const range = formatDateRange(e.startDate, e.endDate, locale);
  return `
<article class="cv-entry">
  <div class="cv-entry-row">
    <div>
      <div class="cv-entry-title">${escapeHtml(e.studyType ?? "")}</div>
      <div class="cv-entry-org">${escapeHtml(e.institution)}${
        e.location ? ` · ${escapeHtml(e.location)}` : ""
      }</div>
    </div>
    <div class="cv-entry-dates">${escapeHtml(range)}</div>
  </div>
  ${e.summary ? `<p class="cv-entry-summary">${escapeHtml(e.summary)}</p>` : ""}
</article>`.trim();
}

function skillsBlock(skills: JsonResume["skills"]): string {
  return `<div class="cv-skills-grid">${skills
    .map(
      (s) => `
<div class="cv-skill-row">
  <span class="cv-skill-bucket-name">${escapeHtml(s.name)}</span>
  <span class="cv-skill-sep" data-decorative> — </span>
  <span class="cv-skill-keywords">${(s.keywords as string[]).map(escapeHtml).join(", ")}</span>
</div>`,
    )
    .join("")}</div>`;
}

function languagesBlock(languages: JsonResume["languages"]): string {
  return `<ul class="cv-language-list">${languages
    .map(
      (l) =>
        `<li><span class="cv-entry-title">${escapeHtml(l.language)}</span>${
          l.fluency ? ` — <span class="cv-muted">${escapeHtml(l.fluency)}</span>` : ""
        }</li>`,
    )
    .join("")}</ul>`;
}

function interestsBlock(interests: JsonResume["interests"]): string {
  return interests
    .map(
      (i) =>
        `<p class="cv-interest">${(i.keywords as string[]).map(escapeHtml).join(" · ")}</p>`,
    )
    .join("");
}

export function render(resumeIn: JsonResume, opts: ThemeRenderOptions): string {
  const resume = normalize(resumeIn);
  const c = opts.customization as Customization;
  const locale = opts.locale;
  const labels = SECTION_LABELS[locale] ?? SECTION_LABELS.fr;

  const themeCss = buildStyles(c);
  const atsCss = atsOverridesCss(opts.atsMode);

  const rawImage = resume.basics.image;
  const showPhoto = typeof rawImage === "string" && rawImage.length > 0 && IMAGE_PROTOCOL_RE.test(rawImage);
  const photo = showPhoto
    ? `<img class="cv-photo" src="${escapeAttr(rawImage)}" alt="" />`
    : "";

  const sections: string[] = [];
  let n = 1;
  if (resume.work.length) {
    sections.push(
      section(
        n++,
        labels.work,
        resume.work.map((w) => workEntry(w, locale)).join(""),
      ),
    );
  }
  if (resume.education.length) {
    sections.push(
      section(
        n++,
        labels.education,
        resume.education.map((e) => eduEntry(e, locale)).join(""),
      ),
    );
  }
  if (resume.skills.length) {
    sections.push(section(n++, labels.skills, skillsBlock(resume.skills)));
  }
  if (resume.languages.length) {
    sections.push(section(n++, labels.languages, languagesBlock(resume.languages)));
  }
  if (resume.interests.length) {
    sections.push(section(n++, labels.interests, interestsBlock(resume.interests)));
  }

  const linkedin = resume.basics.profiles.find(
    (p) => p.network.toLowerCase() === "linkedin",
  );

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(resume.basics.name)} — CV</title>
  <style data-base>${BASE_PRINT_CSS}</style>
  <style data-theme="atelier-classique">${themeCss}</style>
  ${atsCss ? `<style data-ats="${escapeAttr(opts.atsMode)}">${atsCss}</style>` : ""}
</head>
<body>
  <main class="cv" lang="${escapeAttr(locale)}">
    <header class="cv-header">
      <div>
        <h1 class="cv-name">${escapeHtml(resume.basics.name)}</h1>
        ${resume.basics.label ? `<p class="cv-label">${escapeHtml(resume.basics.label)}</p>` : ""}
        ${
          resume.basics.summary
            ? `<p class="cv-summary">${escapeHtml(resume.basics.summary)}</p>`
            : ""
        }
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
    ${sections.join("\n")}
  </main>
</body>
</html>`;
}
