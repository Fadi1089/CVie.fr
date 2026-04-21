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
 * Controls which DOM units the pagination pipeline treats as atomic when
 * content overflows an A4 page:
 *   - "section": entire `<section>` (heading + all entries) moves together.
 *     Matches the "keep the block together" reader expectation.
 *   - "element": only the leaf unit that overflows moves — the section
 *     heading can stay on page N while trailing entries jump to page N+1.
 *     Squeezes more content onto earlier pages for borderline layouts.
 *
 * The mode affects both the PDF (via break-inside CSS) and the iframe
 * preview (via the pagination script). Baked into HTML as a class on
 * `.cv-paginated` so PDF, SSR, and preview share a single source of truth.
 */
export type OverflowMode = "section" | "element";

const DEFAULT_OVERFLOW_MODE: OverflowMode = "section";

function normalizeOverflowMode(mode: OverflowMode | undefined): OverflowMode {
  return mode === "element" ? "element" : DEFAULT_OVERFLOW_MODE;
}

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
  scale = 1,
  overflowMode: OverflowMode = DEFAULT_OVERFLOW_MODE,
): string {
  const css = getTemplateCss(template);
  const body = renderCvBody(data);
  const title = escapeHtml(
    `${data.personalInfo.firstName} ${data.personalInfo.lastName} — CV`,
  );

  // Clamp defensively at render time so a caller passing e.g. NaN or a
  // negative scale can't produce broken calc() values that would silently
  // collapse every template length to 0. The editor slider + route schema
  // also clamp, this is belt-and-braces.
  const safeScale =
    Number.isFinite(scale) && scale > 0
      ? Math.min(2, Math.max(0.5, scale))
      : 1;

  const safeMode = normalizeOverflowMode(overflowMode);

  return `<!DOCTYPE html>
<html lang="fr" style="--cv-scale: ${safeScale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}
${BASE_PAGE_CSS}</style>
</head>
<body style="margin:0">
<div class="cv-canvas">
<div class="cv-paginated cv-overflow-${safeMode}">
${body}
</div>
</div>
<script>${PAGINATION_SCRIPT}</script>
</body>
</html>`;
}

/**
 * Renderer-owned page geometry. Appended AFTER template CSS so it wins the
 * cascade for `@page` descriptors and `.cv` box properties. Templates MUST
 * NOT redeclare these — page margin, size, and per-page gutter are
 * cross-cutting concerns of the pagination pipeline, not a template choice.
 * Keeping them here is what lets a new template ship without breaking PDF
 * layout or diverging preview from PDF.
 *
 * Keep in sync with PAGE_MARGIN_MM in PAGINATION_SCRIPT below.
 */
const BASE_PAGE_CSS = `
/* ==== renderer-owned page geometry (cascade last, template-independent) ==== */
@page {
  size: A4;
  margin: 0.25in;
}
.cv {
  width: 210mm;
  min-height: 297mm;
  padding: 0.25in;
  box-sizing: border-box;
}

.cv [data-editor-section] {
  cursor: pointer;
}

/* ==== overflow-mode contract =============================================
   Drives which DOM units Chromium's PDF page-breaker (and the iframe
   preview script, mirroring the same boundaries) treats as atomic.
   The .cv-paginated wrapper carries a .cv-overflow-{section|element}
   class baked by renderCvHtml; these selectors pick the matching rules.

   Section mode: entire <section> is unbreakable. If a section exceeds one
   content-zone height Chromium still splits it (CSS spec fallback) —
   element mode is the escape hatch for that case.

   Element mode: keep leaf units (article, ul, p) atomic but let the
   section itself break between them. Lets a heading stay on page N with
   a trailing <ul> jumping to N+1. Hard lock: ul is atomic so skills-grouped
   (category lines — cannot page-break reliably) always moves wholesale. */
.cv-paginated.cv-overflow-section .cv > section {
  break-inside: avoid;
  page-break-inside: avoid;
}
.cv-paginated.cv-overflow-element .cv > section > article,
.cv-paginated.cv-overflow-element .cv > section > ul,
.cv-paginated.cv-overflow-element .cv > section > p {
  break-inside: avoid;
  page-break-inside: avoid;
}

@media print {
  .cv-canvas {
    background: #ffffff;
    padding: 0;
  }
  .cv-page-bg,
  .cv-page-advisory {
    display: none;
  }
  .cv-paginated,
  .cv {
    margin: 0;
    box-shadow: none;
  }
  .cv-paginated {
    /* Templates declare .cv-paginated width: 210mm for the iframe preview's
       framed-sheet look. In PDF that literal width exceeds @page's content
       zone (210mm - 2x0.25in = 197.3mm), so the right edge gets clipped and
       the scaled content reflows at a different width than the preview —
       which is exactly the "editor scale != PDF scale" symptom. Collapse to
       parent width so the print content zone matches preview's inner zone
       (210mm - 2x0.25in = same 197.3mm). */
    width: auto;
  }
  .cv {
    /* In PDF, the @page margin above provides the per-page gutter on every
       page (including top of page 2+ and bottom of every page). If .cv also
       kept padding the gutters would stack and shrink the content area. */
    padding: 0;
    min-height: 0;
    width: auto;
  }
  .cv [data-page-push] {
    padding-top: 0 !important;
  }
}
`;

/**
 * Inline script that runs inside the iframe to:
 *   1. Layer "page rectangles" (white, shadow) behind the content at every
 *      297mm boundary — gives the Google Docs multi-page visual feel.
 *   2. Push breakable units so no content lands in a page's top / bottom
 *      gutter or in the visual gap between pages. The preview therefore
 *      shows the SAME per-page margins the PDF will get from `@page margin`.
 *   3. Post the total content height back to the parent so the iframe can
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
  var GAP_MM = 18;
  // Per-page gutter. MUST match @page margin in BASE_PAGE_CSS so the
  // preview's content zone is identical to Chromium's PDF content zone.
  // 0.25in = 6.35mm.
  var PAGE_MARGIN_MM = 25.4 * 0.25;
  var PX_PER_MM = 96 / 25.4;
  var pageHeightPx = PAGE_MM * PX_PER_MM;
  var gapPx = GAP_MM * PX_PER_MM;
  var marginPx = PAGE_MARGIN_MM * PX_PER_MM;
  var stride = pageHeightPx + gapPx;
  var lastPostedHeight = -1;
  // Density scale drives the --cv-scale CSS custom property on the <html>
  // element. Templates reference it inside calc() to shrink fonts, margins,
  // paddings, and borders uniformly — page geometry (A4 size, @page margin,
  // page backdrops) is declared outside the variable system so it stays
  // absolute. Pagination math therefore needs no scale awareness: content
  // naturally occupies less height when scaled, and boundary constants
  // stay fixed at real page dimensions.
  var scale = 1;
  // Overflow mode picks which DOM units to treat as atomic. Initial value
  // is read from the .cv-paginated class baked by renderCvHtml; postMessage
  // overrides let the editor toggle live without a full re-render.
  var overflowMode = 'section';
  var initialWrap = document.querySelector('.cv-paginated');
  if (initialWrap && initialWrap.classList.contains('cv-overflow-element')) {
    overflowMode = 'element';
  }

  window.addEventListener('message', function (e) {
    var data = e && e.data;
    if (!data) return;
    if (data.type === 'cv-scale') {
      var next = Number(data.scale);
      if (!isFinite(next) || next <= 0) return;
      if (next < 0.5) next = 0.5;
      if (next > 1) next = 1;
      if (next === scale) return;
      scale = next;
      document.documentElement.style.setProperty('--cv-scale', String(scale));
      lastPostedHeight = -1;
      schedule();
      return;
    }
    if (data.type === 'cv-overflow-mode') {
      var nextMode = data.mode === 'element' ? 'element' : 'section';
      if (nextMode === overflowMode) return;
      overflowMode = nextMode;
      // Mirror the mode into the class so both the CSS rules (break-inside)
      // and any later re-reads of the initial state stay in sync.
      var wrap = document.querySelector('.cv-paginated');
      if (wrap) {
        wrap.classList.remove('cv-overflow-section', 'cv-overflow-element');
        wrap.classList.add('cv-overflow-' + overflowMode);
      }
      lastPostedHeight = -1;
      schedule();
    }
  });

  function resetPushes(cv) {
    var pushed = cv.querySelectorAll('[data-page-push]');
    for (var i = 0; i < pushed.length; i++) {
      pushed[i].style.paddingTop = '';
      pushed[i].removeAttribute('data-page-push');
    }
  }

  function clearChrome(wrap) {
    var nodes = wrap.querySelectorAll('.cv-page-bg, .cv-page-advisory');
    for (var i = 0; i < nodes.length; i++) nodes[i].remove();
  }

  function buildAdvisory(topMm) {
    var el = document.createElement('div');
    el.className = 'cv-page-advisory';
    el.style.top = topMm + 'mm';
    el.style.height = GAP_MM + 'mm';
    el.innerHTML = '<div class="cv-page-advisory-inner">' +
      '<span class="cv-page-advisory-rule"></span>' +
      '<span class="cv-page-advisory-text"><strong>Usage</strong>En France, un CV gagne à tenir sur deux pages — la concision reste la marque des candidatures soignées.</span>' +
      '<span class="cv-page-advisory-rule"></span>' +
      '</div>';
    return el;
  }

  function paginate() {
    var wrap = document.querySelector('.cv-paginated');
    var cv = document.querySelector('.cv');
    if (!wrap || !cv) return;

    resetPushes(cv);
    clearChrome(wrap);
    // Reset wrap height BEFORE measuring. A previous paginate() at higher
    // scale may have set a tall minHeight; carrying it into this run keeps
    // body.scrollHeight inflated and leaves a dead scroll strip below the
    // content after scaling back down. Strip it, force reflow, then the
    // later re-assignment sets the right value for the new page count.
    wrap.style.minHeight = '';
    void wrap.offsetHeight;

    var contentZoneHeight = pageHeightPx - 2 * marginPx;
    var cvTop = cv.getBoundingClientRect().top;

    // Push el to the top of its next content zone if it spills the current
    // page's bottom gutter. Returns true if a push was applied so callers
    // can track whether the first-overflow decision for a section has fired.
    function pushIfOverflow(el) {
      var rect = el.getBoundingClientRect();
      var top = rect.top - cvTop;
      var bottom = rect.bottom - cvTop;
      var page = Math.floor(top / stride);
      if (page < 0) page = 0;
      var zoneBottom = page * stride + pageHeightPx - marginPx;
      var nextZoneTop = (page + 1) * stride + marginPx;
      if (bottom <= zoneBottom + 0.5) return false;
      if (top >= nextZoneTop - 0.5) return false;
      var pushPx = nextZoneTop - top;
      if (pushPx <= 0) return false;
      var existing = parseFloat(el.style.paddingTop) || 0;
      el.style.paddingTop = (existing + pushPx) + 'px';
      el.setAttribute('data-page-push', '1');
      // Force synchronous layout so later getBoundingClientRect reads
      // reflect the push.
      void el.offsetTop;
      cvTop = cv.getBoundingClientRect().top;
      return true;
    }

    // Walk header + each section in DOM order. In BOTH overflow modes the
    // preview mirrors Chromium's PDF break behavior:
    //
    //   - Section fits in a single content zone → push the whole section
    //     when it overflows (keeps h2 glued to its body, matching
    //     page-break-after:avoid on h2).
    //   - Section is taller than one zone → fall back to per-child pushing
    //     on <article>/<ul>/<p>. The FIRST overflowing unit triggers a
    //     section-level push so the h2 travels with it; subsequent units
    //     push independently, letting the section split between children.
    //
    // The overflow-mode CSS distinction (break-inside:avoid on section vs
    // on children) still drives Chromium's own PDF decisions; the preview
    // script uses the same algorithm in both modes because Chromium's
    // fallback for oversized section-atomic is functionally identical to
    // its element-mode behavior (h2 always glues to first child).
    var topLevel = cv.querySelectorAll(':scope > header, :scope > section');
    for (var i = 0; i < topLevel.length; i++) {
      var el = topLevel[i];
      var elHeight = el.getBoundingClientRect().height;
      if (elHeight <= contentZoneHeight + 0.5) {
        pushIfOverflow(el);
        continue;
      }
      // Oversized — split at atomic children. Leaf units (article/ul/p)
      // all carry break-inside:avoid so Chromium keeps them atomic in the
      // PDF; mirror that by pushing individual children.
      var children = el.querySelectorAll(':scope > article, :scope > ul, :scope > p');
      var firstOverflowHandled = false;
      for (var j = 0; j < children.length; j++) {
        var child = children[j];
        var childRect = child.getBoundingClientRect();
        var childTop = childRect.top - cvTop;
        var childBottom = childRect.bottom - cvTop;
        var childPage = Math.max(0, Math.floor(childTop / stride));
        var childZoneBottom = childPage * stride + pageHeightPx - marginPx;
        var childNextZoneTop = (childPage + 1) * stride + marginPx;
        if (childBottom <= childZoneBottom + 0.5) continue;
        if (childTop >= childNextZoneTop - 0.5) continue;
        if (!firstOverflowHandled) {
          // Push the SECTION so its h2 follows the first overflowing child.
          // This is how Chromium resolves page-break-after:avoid on a h2
          // whose first sibling body gets split to the next page.
          firstOverflowHandled = pushIfOverflow(el);
          continue;
        }
        pushIfOverflow(child);
      }
    }

    // Page count is driven by the LAST REAL CONTENT PIXEL — not cv.height.
    // cv.height reports the layout box including .cv's 0.25in bottom padding
    // and the last section's scaled margin-bottom, neither of which is
    // visible content. Using cv.height tipped single-page CVs at certain
    // density scales into phantom 2-page layouts. Measure the bottom of the
    // last top-level child (header/section) to find the true content edge,
    // then find which page's content zone contains it.
    var cvRectFinal = cv.getBoundingClientRect();
    var contentBottomPx = 0;
    for (var k = 0; k < topLevel.length; k++) {
      var r = topLevel[k].getBoundingClientRect();
      var b = r.bottom - cvRectFinal.top;
      if (b > contentBottomPx) contentBottomPx = b;
    }
    var pageIdx = 0;
    while (pageIdx * stride + pageHeightPx - marginPx < contentBottomPx - 0.5) {
      pageIdx++;
      if (pageIdx > 50) break;
    }
    var numPages = Math.max(1, pageIdx + 1);

    for (var p = 0; p < numPages; p++) {
      var bg = document.createElement('div');
      bg.className = 'cv-page-bg';
      bg.style.top = (p * (PAGE_MM + GAP_MM)) + 'mm';
      wrap.appendChild(bg);
    }

    // Extend the wrapper to the bottom of the last page so the canvas
    // (and parent iframe height) don't cut off mid-page when .cv content
    // ends partway down. Without this, the gray canvas background stops at
    // .cv's intrinsic height while page-bg rects extend past it.
    var lastPageBottomMm = numPages * PAGE_MM + (numPages - 1) * GAP_MM;
    wrap.style.minHeight = lastPageBottomMm + 'mm';

    // Advisory banner lives in the gap between page 1 and page 2, and only
    // when the document actually overflows onto a second page.
    if (numPages >= 2) {
      wrap.appendChild(buildAdvisory(PAGE_MM));
    }

    // Post height derived from pagination math, not documentElement.scrollHeight.
    // scrollHeight retains the prior-run value when the document shrinks
    // (scale 2-pages → back to 1), leaving a dead scroll strip in the parent
    // iframe. Deterministic formula: canvas vertical padding + wrap's set
    // height. Read canvas padding from computed style so a print-mode change
    // or template tweak doesn't silently drift the math.
    var canvasEl = document.querySelector('.cv-canvas');
    var canvasPadY = 0;
    if (canvasEl) {
      var cs = getComputedStyle(canvasEl);
      canvasPadY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    }
    var h = Math.ceil(lastPageBottomMm * PX_PER_MM + canvasPadY);
    if (h !== lastPostedHeight) {
      lastPostedHeight = h;
      window.parent.postMessage({ type: 'cv-height', height: h }, '*');
    }
  }

  function schedule() {
    // requestAnimationFrame lets browser finish any pending layout before
    // we measure — prevents a first-paint flash with wrong page count.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(paginate);
    } else {
      paginate();
    }
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    var sectionNode = target.closest('[data-editor-section]');
    if (!sectionNode) return;
    var sectionId = sectionNode.getAttribute('data-editor-section');
    if (!sectionId) return;
    var itemNode = target.closest('[data-editor-item-id]');
    var itemId = itemNode ? itemNode.getAttribute('data-editor-item-id') : null;
    var payload = { type: 'cv-section-click', sectionId: sectionId };
    if (itemId) payload.itemId = itemId;
    window.parent.postMessage(payload, '*');
  });
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

  return `<header data-editor-section="personalInfo"${info.photoUrl ? ' class="has-photo"' : ""}>
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
    return `<article data-editor-item-id="${escapeHtml(f.id)}">
<div class="entry-header">
<h3>${escapeHtml(f.degree)}</h3>
<p class="entry-meta">${dates}</p>
</div>
<p class="entry-sub">${escapeHtml(f.school)}${city}</p>
${desc}
</article>`;
  });
  return `<section data-editor-section="formations">
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
    return `<article data-editor-item-id="${escapeHtml(e.id)}">
<div class="entry-header">
<h3>${escapeHtml(e.jobTitle)}</h3>
<p class="entry-meta">${dates}</p>
</div>
<p class="entry-sub">${escapeHtml(e.company)}${city}</p>
${descriptionHtml}
${bulletsHtml}
</article>`;
  });
  return `<section data-editor-section="experiences">
<h2>Expériences Professionnelles</h2>
${items.join("\n")}
</section>`;
}

function renderSkills(skills: Skill[]): string {
  if (skills.length === 0) return "";

  // Group by category, preserving insertion order. Uncategorized skills
  // collect into a single trailing bucket rendered without a label.
  const buckets = new Map<string, Skill[]>();
  const UNCATEGORIZED = "__uncategorized__";
  for (const s of skills) {
    const key = s.category?.trim() ? s.category.trim() : UNCATEGORIZED;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(s);
    else buckets.set(key, [s]);
  }

  const items: string[] = [];
  for (const [category, bucketSkills] of buckets) {
    const names = bucketSkills
      .map((s) => {
        const level = s.level
          ? ` <span class="skill-level" data-editor-item-id="${escapeHtml(s.id)}">(${escapeHtml(s.level)})</span>`
          : "";
        return `<span class="skill-token" data-editor-item-id="${escapeHtml(s.id)}"><span class="skill-name">${escapeHtml(s.name)}</span>${level}</span>`;
      })
      .join(", ");
    const label =
      category === UNCATEGORIZED
        ? ""
        : `<strong class="skill-category">${escapeHtml(category)} :</strong> `;
    const fallbackItemId = escapeHtml(bucketSkills[0]?.id ?? "");
    items.push(`<li data-editor-item-id="${fallbackItemId}">${label}${names}</li>`);
  }

  return `<section data-editor-section="skills">
<h2>Compétences</h2>
<ul class="skills-grouped">
${items.join("\n")}
</ul>
</section>`;
}

function renderLanguages(languages: Language[]): string {
  if (languages.length === 0) return "";
  const items = languages.map(
    (l) =>
      `<li data-editor-item-id="${escapeHtml(l.id)}"><span class="lang-name">${escapeHtml(l.name)}</span><span class="lang-level">${escapeHtml(l.level)}</span></li>`,
  );
  return `<section data-editor-section="languages">
<h2>Langues</h2>
<ul class="languages-list">
${items.join("\n")}
</ul>
</section>`;
}

function renderInterests(interests: Interest[]): string {
  if (interests.length === 0) return "";
  const items = interests.map((i) => `<li data-editor-item-id="${escapeHtml(i.id)}">${escapeHtml(i.name)}</li>`);
  return `<section data-editor-section="interests">
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
