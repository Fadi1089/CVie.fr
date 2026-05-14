import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { cvDataSchema, getTheme } from "@cvie/shared";
import { generateResumePdf, pdfFilename } from "../services/pdfService";
import { rateLimit } from "../middleware/rateLimit";
import * as requireAuthModule from "../middleware/requireAuth";
import { canUseTheme } from "../services/themeAccess";
import { resolveUserTier } from "../services/userTier";
import type { Auth0Claims } from "../services/userService";
import {
  listActiveCvs,
  listTrashCvs,
  readCv,
  createCv,
  patchCv,
  resetCv,
  moveCv,
  hardDeleteCv,
  bulkImportCvs,
  CvError,
} from "../services/cvService";

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

// `cvData` is the structured CV; `themeId/atsMode/customization` are
// render-time knobs. Field-by-field validation lets the route emit
// specific French error codes (the existing UX) instead of a single
// generic 400.
const pdfBodySchema = z.object({
  cvData: cvDataSchema,
  themeId: z.string().min(1).max(64),
  atsMode: z.enum(["ats-strict", "ats-balanced", "expressive"]).optional(),
  customization: z.record(z.string(), z.unknown()).default({}),
});

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

    const parsed = pdfBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstPath = parsed.error.issues[0]?.path[0];
      const code =
        firstPath === "cvData"
          ? "VALIDATION_FAILED"
          : firstPath === "themeId"
            ? "INVALID_TEMPLATE"
            : firstPath === "atsMode"
              ? "INVALID_ATS_MODE"
              : firstPath === "customization"
                ? "INVALID_CUSTOMIZATION"
                : "VALIDATION_FAILED";
      const message =
        code === "INVALID_TEMPLATE"
          ? "Le template sélectionné est invalide."
          : code === "INVALID_ATS_MODE"
            ? "Le mode ATS demandé est invalide."
            : code === "INVALID_CUSTOMIZATION"
              ? "La personnalisation du thème est invalide."
              : "Les données du CV sont invalides.";
      return c.json(
        {
          error: message,
          code,
          ...(IS_PROD ? {} : { details: parsed.error.issues }),
        },
        400,
      );
    }

    const { cvData, themeId, atsMode, customization } = parsed.data;
    const theme = getTheme(themeId);
    if (!theme) {
      return c.json(
        { error: "Le template sélectionné est invalide.", code: "INVALID_TEMPLATE" },
        400,
      );
    }

    const userTier = await resolveUserTier(c.get("userClaims") as Auth0Claims | null);
    if (!canUseTheme(theme.meta, userTier)) {
      return c.json(
        {
          error: `Le thème « ${theme.meta.name} » est réservé aux abonnements Premium.`,
          code: "PREMIUM_REQUIRED",
        },
        402,
      );
    }

    const customizationParsed = theme.meta.customizationSchema.safeParse(customization);
    if (!customizationParsed.success) {
      return c.json(
        {
          error: "La personnalisation du thème est invalide.",
          code: "INVALID_CUSTOMIZATION",
          ...(IS_PROD ? {} : { details: customizationParsed.error.issues }),
        },
        400,
      );
    }

    // Reject explicit ats-mode requests that are stricter than the theme supports.
    // (If the client omits atsMode, the resolvedMode fallback below uses the
    // theme's defaultMode, which is by construction always >= minSupported.)
    if (atsMode) {
      const MODE_ORDER: Record<string, number> = {
        "ats-strict": 0,
        "ats-balanced": 1,
        expressive: 2,
      };
      const requested = MODE_ORDER[atsMode];
      const minSupported = MODE_ORDER[theme.meta.atsProfile.minSupported];
      if (requested !== undefined && minSupported !== undefined && requested < minSupported) {
        return c.json(
          {
            error: `Le thème « ${theme.meta.name} » ne prend pas en charge le mode ATS « ${atsMode} » (minimum requis : ${theme.meta.atsProfile.minSupported}).`,
            code: "INCOMPATIBLE_ATS_MODE",
          },
          409,
        );
      }
    }

    const resolvedMode = atsMode ?? theme.meta.atsProfile.defaultMode;

    try {
      const pdf = await generateResumePdf({
        cv: cvData,
        themeId,
        atsMode: resolvedMode,
        customization: customizationParsed.data as Readonly<Record<string, unknown>>,
      });
      const filename = pdfFilename(cvData);
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
        { error: "Impossible de générer le PDF pour le moment.", code: "PDF_GENERATION_FAILED" },
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

authedCv.post("/:id/reset", async (c) => {
  const userId = c.get("userId") as string;
  try {
    const cv = await resetCv(userId, c.req.param("id"));
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
