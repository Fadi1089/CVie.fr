import type {
  CvData,
  Experience,
  Formation,
  Interest,
  Language,
  PersonalInfo,
  Skill,
} from "../types/cv";
import { classiqueCss } from "./styles/classique";
import { minimalisteCss } from "./styles/minimaliste";
import { moderneCss } from "./styles/moderne";

export type TemplateId = "classique" | "moderne" | "minimaliste";

/**
 * Renders a complete, standalone HTML document for a CV.
 *
 * The returned string is self-contained (includes <!DOCTYPE>, <head>, inline
 * <style>) and can be loaded directly into `iframe.srcdoc` or into
 * `page.setContent()` for Playwright PDF generation.
 *
 * All user-controlled strings are HTML-escaped. CSS is scoped under `.cv`.
 */
export function renderCvHtml(
  data: CvData,
  template: TemplateId = "classique",
): string {
  const css = getTemplateCss(template);
  const body = renderCvBody(data);
  const title = escapeHtml(
    `${data.personalInfo.firstName} ${data.personalInfo.lastName} — CV`,
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
</head>
<body style="margin:0">
<div class="cv-canvas">
<div class="cv-paginated">
${body}
</div>
</div>
<script>${PAGINATION_SCRIPT}</script>
</body>
</html>`;
}

/**
 * Inline script that runs inside the iframe to:
 *   1. Layer "page rectangles" (white, shadow) behind the content at every
 *      297mm boundary — gives the Google Docs multi-page visual feel.
 *   2. Post the total content height back to the parent so the iframe can
 *      auto-resize to fit (eliminating the nested-scroll UX issue).
 *
 * Runs after fonts and images load so measurements are stable.
 */
const PAGINATION_SCRIPT = `
(function () {
  // Skip in non-iframe contexts (PDF generation, portfolio SSR). The
  // preview-chrome divs (.cv-page-bg) are hidden by @media print anyway,
  // so running in a headless print-emulated page would just add wasted
  // DOM nodes and trigger no-op postMessages.
  if (window.parent === window) return;

  var PAGE_MM = 297;
  var PX_PER_MM = 96 / 25.4;
  var lastPostedHeight = -1;
  function paginate() {
    var wrap = document.querySelector('.cv-paginated');
    var cv = document.querySelector('.cv');
    if (!wrap || !cv) return;
    var existing = wrap.querySelectorAll('.cv-page-bg');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    var totalPx = cv.getBoundingClientRect().height;
    var pageHeightPx = PAGE_MM * PX_PER_MM;
    var numPages = Math.max(1, Math.ceil(totalPx / pageHeightPx));
    for (var i = 0; i < numPages; i++) {
      var bg = document.createElement('div');
      bg.className = 'cv-page-bg';
      bg.style.top = (i * PAGE_MM) + 'mm';
      wrap.appendChild(bg);
    }
    var h = document.documentElement.scrollHeight;
    if (h !== lastPostedHeight) {
      lastPostedHeight = h;
      window.parent.postMessage({ type: 'cv-height', height: h }, '*');
    }
  }
  if (document.readyState === 'complete') paginate();
  else window.addEventListener('load', paginate);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paginate);
})();
`;

function getTemplateCss(template: TemplateId): string {
  switch (template) {
    case "classique":
      return classiqueCss;
    case "moderne":
      return moderneCss;
    case "minimaliste":
      return minimalisteCss;
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown template: ${String(_exhaustive)}`);
    }
  }
}

function renderCvBody(data: CvData): string {
  return `<article class="cv">
${renderHeader(data.personalInfo)}
${renderFormations(data.formations)}
${renderExperiences(data.experiences)}
${renderSkills(data.skills)}
${renderLanguages(data.languages)}
${renderInterests(data.interests)}
</article>`;
}

function renderHeader(info: PersonalInfo): string {
  const fullName = `${escapeHtml(info.firstName)} ${escapeHtml(info.lastName)}`;
  const contactItems: string[] = [];
  if (info.email) contactItems.push(`<li>${escapeHtml(info.email)}</li>`);
  if (info.phone) contactItems.push(`<li>${escapeHtml(info.phone)}</li>`);
  if (info.city) contactItems.push(`<li>${escapeHtml(info.city)}</li>`);
  const safeLinkedin = safeHttpUrl(info.linkedinUrl);
  if (safeLinkedin) {
    contactItems.push(
      `<li><a href="${escapeHtml(safeLinkedin)}">LinkedIn</a></li>`,
    );
  }
  const safePortfolio = safeHttpUrl(info.portfolioUrl);
  if (safePortfolio) {
    contactItems.push(
      `<li><a href="${escapeHtml(safePortfolio)}">Portfolio</a></li>`,
    );
  }

  const jobTitle = info.jobTitle
    ? `<p class="job-title">${escapeHtml(info.jobTitle)}</p>`
    : "";
  const contact = contactItems.length
    ? `<ul class="contact">${contactItems.join("")}</ul>`
    : "";
  const summary = info.summary
    ? `<p class="summary">${escapeHtml(info.summary)}</p>`
    : "";
  // Photo rendered as <img> (not background-image) so PDF generators preserve
  // it. ATS systems ignore <img> content entirely — only alt text is read.
  const safePhoto = safeImageUrl(info.photoUrl);
  const photo = safePhoto
    ? `<img class="photo" src="${escapeHtml(safePhoto)}" alt="${fullName}" />`
    : "";

  return `<header${info.photoUrl ? ' class="has-photo"' : ""}>
<div class="header-top">
${photo}
<div class="header-identity">
<h1>${fullName}</h1>
${jobTitle}
${contact}
</div>
</div>
${summary}
</header>`;
}

function renderFormations(formations: Formation[]): string {
  if (formations.length === 0) return "";
  const items = formations.map((f) => {
    const dates = formatDateRange(f.startDate, f.endDate);
    const city = f.city ? ` — ${escapeHtml(f.city)}` : "";
    const desc = f.description
      ? `<p class="entry-description">${escapeHtml(f.description)}</p>`
      : "";
    return `<article>
<div class="entry-header">
<h3>${escapeHtml(f.degree)}</h3>
<p class="entry-meta">${dates}</p>
</div>
<p class="entry-sub">${escapeHtml(f.school)}${city}</p>
${desc}
</article>`;
  });
  return `<section>
<h2>Formations</h2>
${items.join("\n")}
</section>`;
}

/**
 * Splits a free-form description into alternating paragraphs and bullet
 * lists. Lines starting with `- ` or `• ` (plus optional whitespace) are
 * treated as bullets; consecutive bullet lines become a single `<ul>`.
 * Other non-empty lines become `<p>` paragraphs.
 */
function renderDescriptionWithBullets(description?: string): string {
  if (!description) return "";
  const lines = description.split(/\r?\n/);
  const out: string[] = [];
  let bulletBuffer: string[] = [];
  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    out.push(
      `<ul>${bulletBuffer.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`,
    );
    bulletBuffer = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = /^\s*(?:-|•|\*)\s+(.+)$/.exec(line);
    if (bulletMatch && bulletMatch[1]) {
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushBullets();
      continue;
    }
    flushBullets();
    out.push(`<p>${escapeHtml(trimmed)}</p>`);
  }
  flushBullets();
  return out.join("");
}

function renderExperiences(experiences: Experience[]): string {
  if (experiences.length === 0) return "";
  const items = experiences.map((e) => {
    const dates = formatDateRange(e.startDate, e.endDate);
    const city = e.city ? ` — ${escapeHtml(e.city)}` : "";
    // Filter out empty / whitespace-only bullets — they'd render as orphan dots.
    const trimmedBullets = e.bullets.filter((b) => b.trim().length > 0);
    const bulletsHtml = trimmedBullets.length
      ? `<ul>${trimmedBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
      : "";
    // Description lines starting with "- " or "• " become bullets in the
    // output; other non-empty lines render as paragraph text. Lets users
    // mix prose and points clés in a single box.
    const descriptionHtml = renderDescriptionWithBullets(e.description);
    return `<article>
<div class="entry-header">
<h3>${escapeHtml(e.jobTitle)}</h3>
<p class="entry-meta">${dates}</p>
</div>
<p class="entry-sub">${escapeHtml(e.company)}${city}</p>
${descriptionHtml}
${bulletsHtml}
</article>`;
  });
  return `<section>
<h2>Expériences Professionnelles</h2>
${items.join("\n")}
</section>`;
}

function renderSkills(skills: Skill[]): string {
  if (skills.length === 0) return "";
  const items = skills.map((s) => {
    const level = s.level
      ? ` <span class="skill-level">(${escapeHtml(s.level)})</span>`
      : "";
    return `<li><span class="skill-name">${escapeHtml(s.name)}</span>${level}</li>`;
  });
  return `<section>
<h2>Compétences</h2>
<ul class="skills-grid">
${items.join("\n")}
</ul>
</section>`;
}

function renderLanguages(languages: Language[]): string {
  if (languages.length === 0) return "";
  const items = languages.map(
    (l) =>
      `<li><span class="lang-name">${escapeHtml(l.name)}</span><span class="lang-level">${escapeHtml(l.level)}</span></li>`,
  );
  return `<section>
<h2>Langues</h2>
<ul class="languages-list">
${items.join("\n")}
</ul>
</section>`;
}

function renderInterests(interests: Interest[]): string {
  if (interests.length === 0) return "";
  const items = interests.map((i) => `<li>${escapeHtml(i.name)}</li>`);
  return `<section>
<h2>Centres d'Intérêt</h2>
<ul class="interests-list">
${items.join("")}
</ul>
</section>`;
}

/**
 * Escape a string for safe interpolation into HTML text content or attributes.
 * Every user-controlled string in the CV MUST go through this before reaching
 * the HTML output — unescaped interpolation is a stored XSS vulnerability.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Format a "YYYY-MM" date as "mois YYYY" in French.
 * Falls back to the raw input if the format is unexpected.
 */
export function formatMonth(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(dateStr);
  if (!match) return escapeHtml(dateStr);
  const [, year, month] = match;
  if (!year || !month) return escapeHtml(dateStr);
  const monthIdx = Number.parseInt(month, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return escapeHtml(dateStr);
  return `${MONTHS_FR[monthIdx]} ${year}`;
}

function formatDateRange(start: string, end?: string): string {
  const startStr = formatMonth(start);
  const endStr =
    !end || end === "present" ? "aujourd'hui" : formatMonth(end);
  return `${startStr} — ${endStr}`;
}

/**
 * Defense-in-depth: return the URL only if its scheme is http(s), else null.
 * Blocks `javascript:`, `data:`, `file:`, `vbscript:` etc. from ever reaching
 * an `<a href>`. The Zod schema should have caught this already, but we
 * re-check here in case validation is bypassed (e.g., direct object literals
 * in tests, future mutations).
 */
export function safeHttpUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const proto = new URL(url).protocol;
    return proto === "http:" || proto === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth equivalent for image URLs. Allows http(s) and data:image/*.
 */
export function safeImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
    if (parsed.protocol === "data:" && url.startsWith("data:image/")) return url;
    return null;
  } catch {
    return null;
  }
}
