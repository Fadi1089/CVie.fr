import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { cvDataSchema } from "@cvie/shared";
import { generateCvPdf, pdfFilename } from "../services/pdfService";
import { rateLimit } from "../middleware/rateLimit";
import * as requireAuthModule from "../middleware/requireAuth";
import {
  listActiveCvs,
  listTrashCvs,
  readCv,
  createCv,
  patchCv,
  moveCv,
  hardDeleteCv,
  bulkImportCvs,
  CvError,
} from "../services/cvService";

const templateIdSchema = z
  .enum(["classique", "moderne", "minimaliste"])
  .optional();

// Client UI exposes scale 0.7–1.0; server allows the wider Playwright-safe
// range 0.5–1.0 so future UI expansion doesn't require a coordinated deploy.
// Anything outside gets rejected rather than silently clamped so malformed
// client payloads are surfaced loudly.
const scaleSchema = z.number().min(0.5).max(1).optional();

const overflowModeSchema = z.enum(["section", "element"]).optional();

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

// ---------------------------------------------------------------------------
// CV data schemas (authed routes)
// ---------------------------------------------------------------------------

const templateIdEnum = z.enum(["classique", "moderne", "minimaliste"]);

const createBodySchema = z.object({
  title: z.string().min(1).max(200),
  templateId: templateIdEnum,
  data: z.unknown(),
  folderId: z.string().min(1).optional(),
});

const patchBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: templateIdEnum.optional(),
  data: z.unknown().optional(),
});

const moveBodySchema = z.object({ folderId: z.string().min(1) });

const importBodySchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    templateId: templateIdEnum,
    data: z.unknown(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime(),
  }),
);

function cvErrorToResponse(err: CvError) {
  switch (err.code) {
    case "VALIDATION":
      return { status: 400 as const, code: "VALIDATION" };
    case "LIMIT_EXCEEDED":
      return { status: 409 as const, code: "LIMIT_EXCEEDED" };
    case "CV_NOT_FOUND":
      return { status: 404 as const, code: "NOT_FOUND" };
    case "TARGET_FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "TARGET_FOLDER_NOT_FOUND" };
    case "HARD_DELETE_REQUIRES_TRASH":
      return { status: 403 as const, code: "HARD_DELETE_REQUIRES_TRASH" };
    default:
      return { status: 500 as const, code: "INTERNAL" };
  }
}

// ---------------------------------------------------------------------------
// Anonymous PDF route
// ---------------------------------------------------------------------------

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

    const templateParsed = templateIdSchema.safeParse(
      (body as { templateId?: unknown })?.templateId,
    );
    if (!templateParsed.success) {
      return c.json(
        {
          error: "Le template sélectionné est invalide.",
          code: "INVALID_TEMPLATE",
        },
        400,
      );
    }

    const scaleParsed = scaleSchema.safeParse(
      (body as { scale?: unknown })?.scale,
    );
    if (!scaleParsed.success) {
      return c.json(
        {
          error: "L'échelle demandée est invalide.",
          code: "INVALID_SCALE",
        },
        400,
      );
    }

    const overflowParsed = overflowModeSchema.safeParse(
      (body as { overflowMode?: unknown })?.overflowMode,
    );
    if (!overflowParsed.success) {
      return c.json(
        {
          error: "Le mode de débordement demandé est invalide.",
          code: "INVALID_OVERFLOW_MODE",
        },
        400,
      );
    }

    try {
      const pdf = await generateCvPdf(
        parsed.data,
        templateParsed.data,
        scaleParsed.data,
        overflowParsed.data,
      );
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

// ---------------------------------------------------------------------------
// Authed CV management sub-router
// Mounted at "/" so cvRoutes.route("/", authedCv) adds all paths under the
// same base as cvRoutes. The PDF route above is already registered and takes
// precedence for POST /pdf; authed routes handle everything else.
// ---------------------------------------------------------------------------

const authedCv = new Hono();
authedCv.use("*", (c, next) => requireAuthModule.requireAuth()(c, next));

authedCv.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const cvs = await listActiveCvs(userId);
  c.header("Cache-Control", "no-store");
  return c.json({
    cvs: cvs.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      title: r.title,
      templateId: r.templateId,
      updatedAt: r.updatedAt,
    })),
  });
});

authedCv.get("/trash", async (c) => {
  const userId = c.get("userId") as string;
  const cvs = await listTrashCvs(userId);
  c.header("Cache-Control", "no-store");
  return c.json({
    cvs: cvs.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      title: r.title,
      templateId: r.templateId,
      updatedAt: r.updatedAt,
    })),
  });
});

// Static routes before dynamic /:id to avoid shadowing
authedCv.post("/import", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = importBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const result = await bulkImportCvs(userId, parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json(result);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const cv = await createCv(userId, parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json({ cv }, 201);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.get("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const cv = await readCv(userId, c.req.param("id"));
  if (!cv) {
    return c.json({ error: "CV introuvable.", code: "NOT_FOUND" }, 404);
  }
  c.header("Cache-Control", "no-store");
  return c.json({ cv });
});

authedCv.patch("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const cv = await patchCv(userId, c.req.param("id"), parsed.data);
    c.header("Cache-Control", "no-store");
    return c.json({ cv });
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.post("/:id/move", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = moveBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    await moveCv(userId, c.req.param("id"), parsed.data.folderId);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

authedCv.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  try {
    await hardDeleteCv(userId, c.req.param("id"));
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof CvError) {
      const { status, code } = cvErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

cvRoutes.route("/", authedCv);
