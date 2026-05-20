import {
  cvToJsonResume,
  injectAppearanceRuntime,
  injectAppearanceVars,
  renderResumeHtml as renderShared,
  requireTheme,
  type CvData,
  type RenderResumeOptions,
} from "@cvie/shared";
import { render as renderStackoverflow } from "jsonresume-theme-stackoverflow";
import qrcode from "qrcode-generator";

/**
 * Builds a minimal black-on-white SVG QR data URI for the given value.
 * Error correction "M" is the standard tradeoff (~15% redundancy).
 *
 * Foreground/background are CSS-var-bound so the appearance pipeline can
 * recolor them via the design panel without re-rendering.
 */
function buildQrSvgDataUri(value: string): string {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  const cells: string[] = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (qr.isDark(y, x)) {
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<g fill="#202931">${cells.join("")}</g>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function injectQrCode(html: string, portfolioUrl: string): string {
  const qrSrc = buildQrSvgDataUri(portfolioUrl);
  const qrHtml =
    `<img class="cv-qr" src="${qrSrc}" alt="QR code du portfolio" />`;
  // Inject right after the opening <header class="header clear"> tag.
  // Upstream emits this exact opening; if it ever drifts the QR silently
  // doesn't render, which is the safer failure mode.
  return html.replace(
    /(<header[^>]*class="[^"]*\bheader\b[^"]*"[^>]*>)/,
    `$1${qrHtml}`,
  );
}

/**
 * Forces light mode and 1cm page margins on the stackoverflow theme.
 *
 * Why: the theme's CSS has `@media (prefers-color-scheme: dark)` that flips
 * `--color-background` to #18181b — when the user's OS is in dark mode the
 * iframe/Chromium inherits that, producing a black PDF. The override
 * re-declares `:root` after the dark media block; equal specificity, later
 * source order wins. `color-scheme: light` also tells UAs not to apply form
 * control auto-darkening.
 *
 * The `@page` override unifies print margins with the in-house themes (1cm).
 */
const STACKOVERFLOW_OVERRIDE_CSS = `
<meta name="color-scheme" content="light">
<style id="cvie-stackoverflow-overrides">
:root {
  color-scheme: light;
  --color-text:            var(--cv-soft, #40484f);
  --color-text-secondary:  var(--cv-soft, #606d76);
  --color-text-muted:      var(--cv-soft, #757575);
  --color-heading:         var(--cv-ink, #202931);
  --color-date:            var(--cv-ink, #202931);
  --color-accent:          var(--cv-accent, #ff6d1f);
  --color-link:            var(--cv-link, #0095ff);
  --color-link-hover:      var(--cv-link, #0c65a5);
  --color-background:      var(--cv-canvas, #ffffff);
  --color-background-alt:  var(--cv-canvas, #f1f8ff);
  --color-border:          var(--cv-rule, #ccc);
  --color-border-light:    var(--cv-rule, #ddd);
  --color-keyword-text:    var(--cv-ink, #2c5777);
  --color-keyword-bg:      var(--cv-canvas, #dfeaf1);
  --color-keyword-border:  var(--cv-rule, #dfeaf1);
  --color-reference-border:var(--cv-accent, #ff6d1f);
  --color-section-title-bg:var(--cv-canvas, #ffffff);

  /* Per-role font sizes — each rem default takes its own pt delta.
     pt and rem compose fine inside calc(). */
  --fs-name:    calc(2.143rem + var(--cv-text-name-delta, 0pt));
  --fs-label:   calc(1.429rem + var(--cv-text-label-delta, 0pt));
  --fs-section: calc(0.857rem + var(--cv-text-section-delta, 0pt));
  --fs-title:   calc(1.143rem + var(--cv-text-title-delta, 0pt));
  --fs-card:    calc(1.071rem + var(--cv-text-card-delta, 0pt));
  --fs-body:    calc(1rem     + var(--cv-text-body-delta, 0pt));
  --fs-meta:    calc(0.929rem + var(--cv-text-meta-delta, 0pt));
  --fs-fine:    calc(0.786rem + var(--cv-text-fine-delta, 0pt));

  /* Per-role line heights — unitless additive deltas.
     --lh-base is driven by --cv-lh-snug-delta on purpose: the panel exposes
     one unified "Interligne" slider that should affect both the snug and
     base scopes (sections, cards, paragraphs, summary). */
  --lh-tight: calc(1.15 + var(--cv-lh-tight-delta, 0));
  --lh-snug:  calc(1.3  + var(--cv-lh-snug-delta, 0));
  --lh-base:  calc(1.5  + var(--cv-lh-snug-delta, 0));

  /* Spacing — sliders bind to the same --sp-* tokens. */
  --sp-4: calc(1.143rem + var(--cv-space-section-delta, 0mm));
  --sp-3: calc(0.857rem + var(--cv-space-item-delta, 0mm));

  /* Typography. Font-family override is a single CSS var; fallback chain
     is hard-coded so the PDF stays deterministic. Letter-spacing applies
     to body only via the rule below. */
  --font-family: var(--cv-font-family, "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif);
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: light;
    --color-text:           var(--cv-soft, #40484f);
    --color-text-secondary: var(--cv-soft, #606d76);
    --color-text-muted:     var(--cv-soft, #757575);
    --color-heading:        var(--cv-ink, #202931);
    --color-date:           var(--cv-ink, #202931);
    --color-accent:         var(--cv-accent, #ff6d1f);
    --color-link:           var(--cv-link, #0095ff);
    --color-link-hover:     var(--cv-link, #0c65a5);
    --color-background:     var(--cv-canvas, #ffffff);
    --color-background-alt: var(--cv-canvas, #f1f8ff);
    --color-border:         var(--cv-rule, #ccc);
    --color-border-light:   var(--cv-rule, #ddd);
    --color-keyword-text:   var(--cv-ink, #2c5777);
    --color-keyword-bg:     var(--cv-canvas, #dfeaf1);
    --color-keyword-border: var(--cv-rule, #dfeaf1);
    --color-reference-border:var(--cv-accent, #ff6d1f);
    --color-section-title-bg:var(--cv-canvas, #ffffff);
  }
}
html, body { background: #ffffff !important; color: #40484f; }
/* The upstream stylesheet pins body/html to a literal font-size 14px,
   which means the "Corps" slider only affects the few rules that read
   --fs-body directly (KeywordList prefixes). Re-bind body font-size to
   --fs-body so the slider drives all inherited body text. */
html, body { font-size: var(--fs-body); }
/* Page margins + body letter-spacing. h1 / .name keep 0 so the display
   treatment stays consistent. */
body {
  padding: calc(10mm + var(--cv-space-page-delta, 0mm));
  box-sizing: border-box;
  letter-spacing: var(--cv-letter-spacing, 0em);
}
h1, .name { letter-spacing: 0em; }
@page { size: A4; margin: 0; }

/* Photo on the left, optional QR on the right. Both strokes use the accent
   palette channel so the user can recolor them from the Design panel.
   Photo width is driven by --cv-media-delta; QR width by --cv-qr-delta
   (independent sliders in the panel). */
.header { display: flow-root; }
.header > .image {
  float: left;
  width: calc(11em + var(--cv-media-delta, 0mm));
  margin: 0 1.5rem 0.5rem 0;
  border: 2px solid var(--cv-accent, #2C5777);
  border-radius: 4px;
}
.header > .cv-qr {
  float: right;
  width: calc(8em + var(--cv-qr-delta, 0mm));
  height: auto;
  margin: 0 0 0.5rem 1.5rem;
  border: 2px solid var(--cv-accent, #2C5777);
  border-radius: 4px;
  display: block;
}

/* Hide Font Awesome icons so the preview matches the PDF. */
.icon, [class*="fa-"] { display: none !important; }

/* Disable the theme's screen-only width override so preview matches PDF. */
.resume { width: auto !important; margin: 0 !important; padding: 0.1em !important; }
</style>
`.trim();

function injectStackoverflowOverrides(html: string): string {
  // Mirror @media print rules to screen so the iframe preview renders the
  // same way the PDF does (which already runs under emulateMedia("print")).
  // Equivalent rules are applied in both contexts, so what the user sees in
  // the preview matches the exported PDF.
  const widened = html
    .replace(/@media\s+print\s*\{/g, "@media print, screen {")
    // The theme references `./override.css` with a relative URL. In our srcDoc
    // iframe (origin "null") that resolves against the parent and 404s,
    // spamming the console with CORB warnings. The inline overrides below
    // already replicate every rule the file would have applied, so the link
    // is dead weight — drop it.
    .replace(/<link\b[^>]*href=["'][^"']*override\.css["'][^>]*>/gi, "");
  const idx = widened.lastIndexOf("</head>");
  if (idx === -1) {
    return STACKOVERFLOW_OVERRIDE_CSS + widened;
  }
  return widened.slice(0, idx) + STACKOVERFLOW_OVERRIDE_CSS + widened.slice(idx);
}

/**
 * Server-side render dispatcher.
 *
 * Most themes (the in-house Atelier set) render purely from string templates
 * and run in any JS runtime — shared's `renderResumeHtml` handles them. But
 * community themes like `jsonresume-theme-stackoverflow` use Node-only APIs
 * (`fs.readFileSync`, `__dirname`, Svelte SSR runtime) that crash in the
 * browser bundle. To keep the client bundle clean, those themes have a stub
 * `render` in shared that throws, and the real render lives here.
 *
 * The PDF service and the preview-html endpoint both go through this
 * dispatcher so the two paths stay in sync.
 */
export function renderResumeHtmlServer(
  cv: CvData,
  opts: RenderResumeOptions,
): string {
  const theme = requireTheme(opts.themeId);

  if (opts.themeId === "community-stackoverflow") {
    const resume = cvToJsonResume(cv);
    const locale = cv.appearance?.locale ?? "fr";
    // Validate customization for symmetry with renderShared, even though
    // this theme exposes no knobs today.
    const customization = {
      ...theme.meta.defaultCustomization,
      ...opts.customization,
    };
    const parsed = theme.meta.customizationSchema.safeParse(customization);
    if (!parsed.success) {
      throw new Error(
        `Invalid customization for theme '${opts.themeId}': ${parsed.error.message}`,
      );
    }
    const rawHtml = renderStackoverflow(resume, { language: locale });
    const portfolioUrl = cv.personalInfo.portfolioUrl?.trim();
    const withQr = portfolioUrl
      ? injectQrCode(rawHtml, portfolioUrl)
      : rawHtml;
    const themed = injectStackoverflowOverrides(withQr);
    // The override block above re-declares every `--color-*` token the
    // theme reads (text, link, border, background, etc.) as
    // `var(--cv-<role>, fallback)`. injectAppearanceVars writes --cv-*
    // values to `<style data-appearance>:root{...}`, and the appearance
    // runtime mutates the same custom properties live on postMessage —
    // both paths now flow through to the stackoverflow render.
    const withVars = injectAppearanceVars(themed, cv.appearance, opts.scale ?? 1);
    return injectAppearanceRuntime(withVars);
  }

  return renderShared(cv, opts);
}
