import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cvDataSchema } from "@cvie/shared";
import { generateCvPdf, pdfFilename } from "../services/pdfService";
import { rateLimit } from "../middleware/rateLimit";

/**
 * Resolve the PDF rate limit from env with NaN-safe fallback. A malformed
 * value like `PDF_RATE_LIMIT_PER_MIN=abc` would otherwise parse to NaN and
 * silently disable the limiter (NaN compared with > is always false).
 */
const PDF_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.PDF_RATE_LIMIT_PER_MIN;
  if (!raw) return 10;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
})();

// 256 KB is generous for a CV JSON — typical payload is <10 KB; hard cap
// prevents attackers from OOMing the server via huge bullets/descriptions.
const MAX_BODY_BYTES = 256 * 1024;

const IS_PROD = process.env.NODE_ENV === "production";

export const cvRoutes = new Hono();

cvRoutes.post(
  "/pdf",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) =>
      c.json(
        {
          error: "La requête est trop volumineuse.",
          code: "PAYLOAD_TOO_LARGE",
        },
        413,
      ),
  }),
  rateLimit({ max: PDF_RATE_LIMIT_PER_MIN, windowMs: 60_000 }),
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: "Le corps de la requête doit être un JSON valide.",
          code: "INVALID_JSON",
        },
        400,
      );
    }

    const parsed = cvDataSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Les données du CV sont invalides.",
          code: "VALIDATION_FAILED",
          // Field paths in dev help debugging; in production we only return
          // the top-level error message so we don't leak schema internals.
          ...(IS_PROD ? {} : { details: parsed.error.issues }),
        },
        400,
      );
    }

    try {
      const pdf = await generateCvPdf(parsed.data);
      const filename = pdfFilename(parsed.data);
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[pdfService] generation failed:", err);
      return c.json(
        {
          error: "Impossible de générer le PDF pour le moment.",
          code: "PDF_GENERATION_FAILED",
        },
        500,
      );
    }
  },
);
