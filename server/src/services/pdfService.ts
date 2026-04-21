import { chromium, type Browser } from "playwright";
import {
  renderCvHtml,
  safeImageUrl,
  type CvData,
  type OverflowMode,
  type TemplateId,
} from "@cvie/shared";

/**
 * Singleton Chromium browser. One launch per server lifetime, reused across
 * requests. Contexts (not the whole browser) are cheap per-request and give
 * request isolation.
 */
let browserPromise: Promise<Browser> | null = null;
const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
const PHOTO_FETCH_TIMEOUT_MS = 5_000;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const browser = await chromium.launch({ headless: true, timeout: 15_000 });
      // Reset the singleton on disconnect (crash, OOM-kill, manual close) so
      // the next request triggers a fresh launch instead of hitting a dead
      // handle forever.
      browser.on("disconnected", () => {
        browserPromise = null;
      });
      return browser;
    })();
    // Also reset if the launch itself rejects.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

/**
 * Render the given CV to an ATS-compatible A4 PDF.
 *
 * Uses Playwright's Chromium to load the same HTML that the iframe preview
 * uses (renderCvHtml from @cvie/shared), emulates `print` media so the
 * template's `@media print` rules kick in, and outputs at the CSS-declared
 * A4 page size.
 *
 * Network fetches are BLOCKED inside the render context — no http(s), ws,
 * or other requests leave the server. Only data: URIs (e.g., the SVG photo
 * placeholder) reach the renderer. This prevents SSRF via user-supplied URLs
 * in CV fields.
 */
export async function generateCvPdf(
  data: CvData,
  template: TemplateId = "classique",
  scale = 1,
  overflowMode: OverflowMode = "section",
): Promise<Uint8Array> {
  // Playwright accepts scale 0.1–2. Clamp defensively even though the route
  // schema caps it — keeps the service safe when called from other code paths.
  const safeScale = Math.min(2, Math.max(0.1, Number.isFinite(scale) ? scale : 1));
  const browser = await getBrowser();
  // Pin viewport to full A4 width (210mm @ 96dpi = 794px). Templates declare
  // .cv-paginated with `width: 210mm` for the iframe preview chrome; a
  // narrower viewport makes that element overflow the body horizontally,
  // which Chromium clips on the right edge of the print canvas (symptom:
  // trailing date characters chopped off). Matching the viewport to the
  // CSS page width lets the pre-print layout and the print canvas share
  // the same x-axis — @media print later collapses widths to content zone.
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    // Defense-in-depth SSRF block: abort every non-data: request before it
    // hits the network. Exception: Google Fonts CDN — templates @import
    // webfonts (Newsreader/Inter in classique), and falling back to
    // Georgia/Times changes glyph metrics enough that the PDF reflows to
    // an extra page vs. the preview iframe (which loads fonts freely).
    // Hostnames are fixed, no user data reaches the URL → not an SSRF vector.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:") || url.startsWith("about:")) {
        return route.continue();
      }
      try {
        const host = new URL(url).host;
        if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
          return route.continue();
        }
      } catch {
        /* malformed URL — fall through to abort */
      }
      return route.abort();
    });

    const html = renderCvHtml(
      await inlineRemotePhotoForPdf(data),
      template,
      safeScale,
      overflowMode,
    );
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 10_000,
    });
    // Block until webfonts finish downloading + parsing. Without this,
    // Chromium can snapshot the PDF before Newsreader/Inter resolve and
    // render with fallback metrics — the same source of preview/PDF
    // pagination divergence the route allowlist above is meant to fix.
    // Run in the page context — `document` resolves there, not in Node.
    // Typed as a string-bodied function so the server tsconfig (no DOM lib)
    // doesn't choke on the `document` reference.
    await page.evaluate("document.fonts && document.fonts.ready");
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      // Per-page margin comes from the renderer's `@page` rule (see
      // BASE_PAGE_CSS). `preferCSSPageSize: true` makes Chromium honor it,
      // and the Playwright `margin` option would be ignored anyway — so we
      // don't pass one here, to keep the single source of truth.
      //
      // We deliberately do NOT pass Playwright's `scale` option: that scales
      // the whole rendered page (content + margins) down onto A4, producing
      // a tiny CV with big white borders. Density scaling is driven by the
      // --cv-scale CSS variable injected by renderCvHtml, which multiplies
      // only template-owned lengths (fonts, margins, padding) — A4 page
      // geometry stays exactly 210×297mm.
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await context.close();
  }
}

/**
 * Materializes an http(s) profile photo into a data URI so the PDF renderer
 * can stay on a zero-network policy. Existing data URIs are preserved.
 */
export async function inlineRemotePhotoForPdf(
  data: CvData,
  fetchImpl: typeof fetch = fetch,
): Promise<CvData> {
  const photoUrl = safeImageUrl(data.personalInfo.photoUrl);
  if (!photoUrl || photoUrl.startsWith("data:image/")) {
    return data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTO_FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(photoUrl, {
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return data;

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
    if (!contentType || !contentType.startsWith("image/")) {
      return data;
    }

    const declaredLength = Number.parseInt(
      res.headers.get("content-length") ?? "",
      10,
    );
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_REMOTE_IMAGE_BYTES
    ) {
      return data;
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_REMOTE_IMAGE_BYTES) {
      return data;
    }

    return {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        photoUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
      },
    };
  } catch {
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Release the browser process. Call from SIGTERM/SIGINT handlers so Chromium
 * doesn't leak on deploy restarts.
 */
export async function shutdownPdfService(): Promise<void> {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  try {
    const browser = await pending;
    await browser.close();
  } catch {
    // Already closed or failed to launch — nothing to do.
  }
}

/**
 * Accent-stripped, kebab-cased slug for filenames.
 * slugify("Yasmine Benali") → "yasmine-benali"
 */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function pdfFilename(data: CvData): string {
  const slug = slugify(
    `${data.personalInfo.firstName}-${data.personalInfo.lastName}`,
  );
  return `${slug || "cv"}-cv.pdf`;
}
