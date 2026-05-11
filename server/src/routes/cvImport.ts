import { Hono } from "hono";
import type { AiProvider } from "@cvie/shared";
import { rateLimit } from "../middleware/rateLimit";
import { extractCvFromPdf } from "../services/cvImportService";
import { resolveProviderKey } from "../services/aiKeyResolver";
import { getUserIdByAuth0Sub } from "../services/userService";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const CV_IMPORT_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.CV_IMPORT_RATE_LIMIT_PER_MIN;
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

function pickProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (raw === "openai") return "openai";
  if (raw === "google") return "google";
  return "anthropic";
}

export const cvImportRoutes = new Hono();

cvImportRoutes.use("*", rateLimit({ max: CV_IMPORT_RATE_LIMIT_PER_MIN, windowMs: 60_000 }));

cvImportRoutes.post("/", async (c) => {
  const provider = pickProvider();
  const claims = c.get("userClaims");
  const userId = claims ? await getUserIdByAuth0Sub(claims.sub) : null;
  const resolved = await resolveProviderKey(userId, provider);

  if (!resolved) {
    console.error("[cv/import] AI API key not available for provider:", provider);
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

  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return c.json({ error: "Le fichier n'est pas un PDF valide.", code: "INVALID_TYPE" }, 400);
  }

  try {
    const cvData = await extractCvFromPdf(buffer, provider, resolved.key);
    console.info("[cv/import] success", JSON.stringify({ source: resolved.source, provider }));
    return c.json({ data: cvData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction échouée";
    console.error("[cv/import] extraction failed:", err);
    return c.json({ error: message, code: "EXTRACTION_FAILED" }, 422);
  }
});
