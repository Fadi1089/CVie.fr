import { chromium, type Browser } from "playwright";
import { renderCvHtml, safeImageUrl, type CvData } from "@cvie/shared";

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
export async function generateCvPdf(data: CvData): Promise<Uint8Array> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // Defense-in-depth SSRF block: abort every non-data: request before it
    // hits the network. The Classique template uses only inline assets
    // (data URIs + embedded CSS), so nothing legitimate needs the network.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:") || url.startsWith("about:")) {
        return route.continue();
      }
      return route.abort();
    });

    const html = renderCvHtml(
      await inlineRemotePhotoForPdf(data),
      "classique",
    );
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 10_000,
    });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
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
