import { Hono } from "hono";
import { rateLimit } from "../middleware/rateLimit";
import { extractCvFromPdf } from "../services/cvImportService";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const CV_IMPORT_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.CV_IMPORT_RATE_LIMIT_PER_MIN;
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

function hasApiKey(): boolean {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const cvImportRoutes = new Hono();

cvImportRoutes.use("*", rateLimit({ max: CV_IMPORT_RATE_LIMIT_PER_MIN, windowMs: 60_000 }));

cvImportRoutes.post("/", async (c) => {
  if (!hasApiKey()) {
    console.error("[cv/import] AI API key not set for provider:", process.env.AI_PROVIDER ?? "anthropic");
    return c.json({ error: "Service d'import non configuré.", code: "SERVICE_UNAVAILABLE" }, 503);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Corps de requête invalide.", code: "BAD_REQUEST" }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "Aucun fichier PDF fourni.", code: "NO_FILE" }, 400);
  }

  if (file.type !== "application/pdf") {
    return c.json({ error: "Le fichier doit être un PDF.", code: "INVALID_TYPE" }, 400);
  }

  if (file.size > MAX_PDF_BYTES) {
    return c.json({ error: "Le fichier dépasse la limite de 5 Mo.", code: "FILE_TOO_LARGE" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Verify PDF magic bytes (%PDF-)
  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return c.json({ error: "Le fichier n'est pas un PDF valide.", code: "INVALID_TYPE" }, 400);
  }

  try {
    const cvData = await extractCvFromPdf(buffer);
    return c.json({ data: cvData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction échouée";
    console.error("[cv/import] extraction failed:", err);
    return c.json({ error: message, code: "EXTRACTION_FAILED" }, 422);
  }
});
