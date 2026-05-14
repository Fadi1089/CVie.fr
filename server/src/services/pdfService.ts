import { chromium, type Browser } from "playwright";
import {
  renderResumeHtml,
  safeImageUrl,
  type CvData,
  type AtsMode,
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
 * Uses Playwright's Chromium to load HTML produced by `renderResumeHtml`
 * (theme-driven, JSON Resume backed) and outputs at the CSS-declared A4
 * page size. Network fetches are blocked except Google Fonts.
 */
export type GeneratePdfInput = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Readonly<Record<string, unknown>>;
};

export async function generateResumePdf(input: GeneratePdfInput): Promise<Uint8Array> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:") || url.startsWith("about:")) return route.continue();
      try {
        const host = new URL(url).host;
        if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
          return route.continue();
        }
      } catch { /* fall through */ }
      return route.abort();
    });

    const inlinedCv = await inlineRemotePhotoForPdf(input.cv);
    const html = renderResumeHtml(inlinedCv, {
      themeId: input.themeId,
      atsMode: input.atsMode,
      customization: input.customization,
    });

    await page.setContent(html, { waitUntil: "load", timeout: 10_000 });
    await page.evaluate("document.fonts && document.fonts.ready");
    await page.emulateMedia({ media: "print" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await context.close();
  }
}

/** @deprecated Use generateResumePdf. Kept temporarily so the old route
 *  still compiles during the route migration in Task 3.4. Remove in Phase 10. */
export async function generateCvPdf(
  data: CvData,
  template: string = "atelier-classique",
  _scale = 1,
  _overflowMode: unknown = "section",
): Promise<Uint8Array> {
  return generateResumePdf({
    cv: data,
    themeId: template,
    atsMode: "ats-balanced",
    customization: {},
  });
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
 * Pre-launch the singleton browser at server boot so the first user-facing
 * PDF request doesn't pay the 2–5s Chromium cold-start cost. Errors are
 * swallowed: a launch failure here just defers the cost back to the first
 * request, which is no worse than today's behavior.
 */
export async function warmupPdfService(): Promise<void> {
  try {
    await getBrowser();
  } catch (err) {
    console.warn("[pdfService] warmup failed:", (err as Error).message);
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
